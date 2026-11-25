import sys, glob
from PIL import Image
d, prefix, cols = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 5
fs = sorted(glob.glob(f'{d}/{prefix}-*.jpg'))
im0 = Image.open(fs[0]); W = 400 if im0.width > im0.height else 200; H = int(W * im0.height / im0.width)
rows = (len(fs) + cols - 1) // cols
sh = Image.new('RGB', (cols * (W + 6), rows * (H + 6)), 'white')
for k, f in enumerate(fs): sh.paste(Image.open(f).resize((W, H)), ((k % cols) * (W + 6), (k // cols) * (H + 6)))
sh.save(f'{d}/sheet-{prefix}.jpg', quality=78)
