from skimage.metrics import structural_similarity as ssim
from skimage import io, img_as_float
import numpy as np

img_ref = img_as_float(io.imread("rayTracing.png"))
imgs = ["hybrid.png", "SSR_filtered.png", "SSR.png"]

for i in imgs: 
    img_test = img_as_float(io.imread(i))

    score, diff = ssim(img_ref, img_test, channel_axis=-1, full=True, data_range=np.max(img_ref) - np.min(img_ref),)
    print("mode: ", i, "SSIM:", score)
 
# Optional: save or visualize the difference map
#io.imsave("ssim_diff.png", (diff - diff.min()) / (diff.max() - diff.min()))