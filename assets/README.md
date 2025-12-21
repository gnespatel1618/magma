# App Icons

This directory should contain the app icon files for different platforms:

- `icon.icns` - macOS icon file (required for Mac dock icon)
- `icon.ico` - Windows icon file
- `icon.png` - Linux icon file (512x512 or 1024x1024 pixels recommended)

## Creating the macOS Icon

To create the `.icns` file from the Magma logo:

1. Create a high-resolution PNG (1024x1024 pixels) of the Magma logo
2. Use a tool like `iconutil` on macOS:
   ```bash
   # Create an iconset directory
   mkdir Magma.iconset
   
   # Copy your 1024x1024 icon.png to various sizes
   sips -z 16 16     icon.png --out Magma.iconset/icon_16x16.png
   sips -z 32 32     icon.png --out Magma.iconset/icon_16x16@2x.png
   sips -z 32 32     icon.png --out Magma.iconset/icon_32x32.png
   sips -z 64 64     icon.png --out Magma.iconset/icon_32x32@2x.png
   sips -z 128 128   icon.png --out Magma.iconset/icon_128x128.png
   sips -z 256 256   icon.png --out Magma.iconset/icon_128x128@2x.png
   sips -z 256 256   icon.png --out Magma.iconset/icon_256x256.png
   sips -z 512 512   icon.png --out Magma.iconset/icon_256x256@2x.png
   sips -z 512 512   icon.png --out Magma.iconset/icon_512x512.png
   sips -z 1024 1024 icon.png --out Magma.iconset/icon_512x512@2x.png
   
   # Generate the .icns file
   iconutil -c icns Magma.iconset -o icon.icns
   ```

Alternatively, you can use online tools or apps like "Icon Composer" to create the `.icns` file.

The icon should be based on the Magma logo (the stylized "M" with molten appearance).

