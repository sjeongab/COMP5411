const ssrFragmentShader = `
        #include <packing>

        precision highp float;

        uniform sampler2D gColor;
        uniform sampler2D gNormal;
        uniform sampler2D gPosition;
        uniform sampler2D gReflection;
        uniform sampler2D gDepth;
        uniform vec2 resolution;
        uniform samplerCube gBackground;

        uniform mat4 projectionMatrix;
        uniform mat4 inverseProjectionMatrix;
        uniform mat4 inverseViewMatrix;
        uniform vec3 cameraWorldPosition;
        uniform float cameraNear;
        uniform float cameraFar;
        

        out vec4 FragColor;

        float pointToLineDistance(vec3 x0, vec3 x1, vec3 x2) {
			return length(cross(x0-x1,x0-x2))/length(x2-x1);
		}
		float pointPlaneDistance(vec3 point,vec3 planePoint,vec3 planeNormal){
			float a=planeNormal.x,b=planeNormal.y,c=planeNormal.z;
			float x0=point.x,y0=point.y,z0=point.z;
			float x=planePoint.x,y=planePoint.y,z=planePoint.z;
			float d=-(a*x+b*y+c*z);
			float distance=(a*x0+b*y0+c*z0+d)/sqrt(a*a+b*b+c*c);
			return distance;
		}

        float getDepth( const in vec2 uv ) {
			return texture2D( gDepth, uv ).r;
		}
		float getViewZ( const in float depth ) {
            return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
		}

        float linearDepth(float depthSample) {
            float z = depthSample * 2.0 - 1.0;
            float d =  (cameraNear * cameraFar ) / (cameraFar + cameraNear - z * (cameraFar));
            return (d - cameraNear) / (cameraFar - cameraNear);
        }

        vec3 getViewPosition( const in vec2 uv, const in float depth/*clip space*/, const in float clipW ) {
			vec4 clipPosition = vec4( ( vec3( uv, depth ) - 0.5 ) * 2.0, 1.0 );//ndc
			clipPosition *= clipW; //clip
			return ( inverseProjectionMatrix * clipPosition ).xyz;//view
		}
		vec3 getViewNormal( const in vec2 uv ) {
			return unpackRGBToNormal( texture2D( gNormal, uv ).xyz );
		}

        vec2 viewPositionToXY(vec3 viewPosition){
			vec2 xy;
			vec4 clip=projectionMatrix*vec4(viewPosition,1);
			xy=clip.xy;//clip
			float clipW=clip.w;
			xy/=clipW;//NDC
			xy=(xy+1.)/2.;//uv
			xy*=resolution;//screen
			return xy;
		}

        void main() {
            vec2 uv = gl_FragCoord.xy / resolution;
            vec3 albedo = texture(gColor, uv).rgb;
            vec3 normal = texture(gNormal, uv).xyz;
            vec3 position = texture(gPosition, uv).xyz;
            float reflectivity = texture(gReflection, uv).r;
            float depth = texture(gDepth, uv).r;
            float viewZ = perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
            float linearDepthSample = linearDepth(depth);
            float thickness = 0.018;
            vec3 objectColor;
            float clipW = projectionMatrix[2][3] * viewZ+projectionMatrix[3][3];
            vec3 viewPosition=getViewPosition( uv, depth, clipW );
            bool coloured = false;

            for(int j = 0; j<1; j++){
            if(-viewZ>cameraFar) {
                objectColor = vec3(1.0,0.0,0.0);
                //objectColor = textureCube(gBackground, uv).rgb;
                coloured = true;
                break;
            }

            /*if (reflectivity < 0.3 ) { 
                objectColor = textureCube(gBackground, position).rgb;
                coloured = true;
                break;
            }*/

            if (reflectivity < 1.0 ) { 
            objectColor = albedo;
                coloured = true;
                break;
            }
            

            vec2 d0=gl_FragCoord.xy;
			vec2 d1;

			vec3 viewNormal=getViewNormal( uv );

            //vec3 viewIncidentDir=normalize(viewPosition);
            //vec3 viewReflectDir=reflect(viewIncidentDir,viewNormal);

            vec3 viewIncidentDir=vec3(0,0,-1);
            vec3 viewReflectDir=reflect(viewIncidentDir,viewNormal);

            float maxDistance = 1500.0;
            float maxReflectRayLen=maxDistance/dot(-viewIncidentDir,viewNormal);


            vec3 d1viewPosition=viewPosition+viewReflectDir*maxReflectRayLen;
            if(d1viewPosition.z>-cameraNear){
                //https://tutorial.math.lamar.edu/Classes/CalcIII/EqnsOfLines.aspx
                float t=(-cameraNear-viewPosition.z)/viewReflectDir.z;
                d1viewPosition=viewPosition+viewReflectDir*t;
            }
            d1=viewPositionToXY(d1viewPosition);

			float totalLen=length(d1-d0);
			float xLen=d1.x-d0.x;
			float yLen=d1.y-d0.y;
			float totalStep=max(abs(xLen),abs(yLen));
			float xSpan=xLen/totalStep;
			float ySpan=yLen/totalStep;

            int MAX_STEP = 1000;

            for(float i=0.;i<float(MAX_STEP);i++){
				if(i>=totalStep) break;
				vec2 xy=vec2(d0.x+i*xSpan,d0.y+i*ySpan);
				//if(xy.x<0.||xy.x>resolution.x||xy.y<0.||xy.y>resolution.y) break;
				float s=length(xy-d0)/totalLen;
				vec2 uv=xy/resolution;

                float d = getDepth(uv);
				float vZ = getViewZ( d );
                if(-vZ>=cameraFar) continue;
				float cW = projectionMatrix[2][3] * vZ+projectionMatrix[3][3];
				vec3 vP=getViewPosition( uv, d, cW );

                float viewReflectRayZ = (viewPosition.z * d1viewPosition.z) / ((d1viewPosition.z + s*(viewPosition.z - d1viewPosition.z))+0.01);
                if(viewReflectRayZ<=vZ){
                    bool hit;

                    float away=pointToLineDistance(vP,viewPosition,d1viewPosition);

                    float minThickness;
                    vec2 xyNeighbor=xy;
                    xyNeighbor.x+=1.;
                    vec2 uvNeighbor=xyNeighbor/resolution;
                    vec3 vPNeighbor=getViewPosition(uvNeighbor,d,cW);
                    minThickness=vPNeighbor.x-vP.x;
                    minThickness*=3.;
                    float tk=max(minThickness,thickness);


                    hit=away<=tk;

                    if (hit){
                    vec3 vN=getViewNormal( uv );
                    if(dot(viewReflectDir,vN)>=0.) continue;
                    float distance=pointPlaneDistance(vP,viewPosition,viewNormal);
                    if(distance>maxDistance) break;
                    vec3 reflectColor = texture2D(gColor,uv).rgb;
                    objectColor = reflectColor;
                    coloured = true;
                    break;
                    }  
                }

            }
                if(!coloured){
                objectColor =  albedo;
                }
            }


            //**********add phong shading
            vec3 lightDir = normalize(vec3(0, 30, 100) - position);
            vec3 viewDir = normalize(-position); // In view space, camera is at (0, 0, 0)

            // === Ambient Component ===
            vec3 ambient = 0.7 * objectColor;

            // === Diffuse Component ===
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = vec3(0.5, 0.5, 0.8) * (diff * objectColor) * 0.5;

            // === Specular Component ===
            vec3 reflectDir = reflect(-lightDir, normal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 0.1);
            vec3 specular = vec3(0.1, 0.1, 0.1) * (spec * vec3(1.0, 1.0, 1.0));

            // === Combine components and output color ===
            vec3 result = ambient + diffuse + specular;

            
            FragColor = vec4(result, 1.0);
            return;
        }
    `;

export {ssrFragmentShader};