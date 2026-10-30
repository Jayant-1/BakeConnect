import sys
import os
from PIL import Image, ImageFilter, ImageDraw
import rembg

def process_product_image(input_path, output_path, target_size=1024, max_dimension=820, shadow_intensity=0.18):
    print(f"Processing: {input_path} -> {output_path}")
    raw_img = Image.open(input_path).convert("RGBA")
    
    # Step 1: Remove background
    session = rembg.new_session("u2net")
    cutout = rembg.remove(raw_img, session=session)
    
    # Step 2: Trim transparent borders
    bbox = cutout.getbbox()
    if not bbox:
        print(f"Warning: No subject found in {input_path}")
        return False
    
    cropped = cutout.crop(bbox)
    w, h = cropped.size
    
    # Step 3: Resize proportionally to fit inside max_dimension
    scale = min(max_dimension / w, max_dimension / h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Step 4: Create 1024x1024 transparent canvas
    canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    
    # Compute position to center horizontally, slightly below center vertically
    x = (target_size - new_w) // 2
    y = (target_size - new_h) // 2 + 10
    if y + new_h > target_size - 40:
        y = target_size - 40 - new_h
    if y < 40:
        y = 40
        
    # Step 5: Soft grounded contact shadow
    if shadow_intensity > 0:
        shadow_layer = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow_layer)
        
        shadow_w = int(new_w * 0.75)
        shadow_h = int(new_h * 0.12)
        shadow_x0 = (target_size - shadow_w) // 2
        shadow_y0 = y + new_h - int(shadow_h * 0.5)
        shadow_x1 = shadow_x0 + shadow_w
        shadow_y1 = shadow_y0 + shadow_h
        
        alpha = int(255 * shadow_intensity)
        shadow_draw.ellipse([shadow_x0, shadow_y0, shadow_x1, shadow_y1], fill=(52, 36, 33, alpha))
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=int(shadow_h * 0.5) + 6))
        canvas.alpha_composite(shadow_layer)
        
    # Step 6: Paste product cutout
    canvas.alpha_composite(resized, (x, y))
    
    # Save optimized PNG
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    canvas.save(output_path, "PNG", optimize=True)
    print(f"Saved: {output_path} (Subject: {new_w}x{new_h} at ({x}, {y}))")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python process_product_cutout.py <input> <output>")
        sys.exit(1)
    process_product_image(sys.argv[1], sys.argv[2])
