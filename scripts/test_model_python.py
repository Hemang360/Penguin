#!/usr/bin/env python3
"""
Python script to test the model prediction endpoint.
Can be used programmatically to interact with the model API.
"""

import requests
import sys
import json
from pathlib import Path

def test_model_prediction(image_path=None, endpoint="http://localhost:8787/model/predict"):
    """
    Test the model prediction endpoint with an image.
    
    Args:
        image_path: Path to image file (if None, creates a test image)
        endpoint: API endpoint URL
    
    Returns:
        dict: Prediction response
    """
    # Create test image if none provided
    if image_path is None:
        from PIL import Image
        import io
        
        print("Creating test image...")
        img = Image.new('RGB', (224, 224), color=(100, 150, 200))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        image_data = img_bytes.getvalue()
        content_type = "image/png"
    else:
        image_path = Path(image_path)
        if not image_path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")
        
        print(f"Loading image: {image_path}")
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        # Determine content type from extension
        ext = image_path.suffix.lower()
        content_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        content_type = content_type_map.get(ext, 'image/jpeg')
    
    # Make request
    print(f"\nSending request to: {endpoint}")
    print(f"Content-Type: {content_type}")
    print(f"Image size: {len(image_data)} bytes")
    
    try:
        response = requests.post(
            endpoint,
            data=image_data,
            headers={"Content-Type": content_type},
            timeout=30
        )
        
        response.raise_for_status()
        result = response.json()
        
        print("\n✅ Prediction successful!")
        print("\nResponse:")
        print(json.dumps(result, indent=2))
        
        # Pretty print results
        print("\n" + "="*50)
        print("PREDICTION RESULTS")
        print("="*50)
        print(f"Authenticity Score: {result.get('authenticity_score', 'N/A')}")
        print(f"Threshold: {result.get('threshold', 'N/A')}")
        print(f"Status: {result.get('status', 'N/A')}")
        
        score = result.get('authenticity_score', 0)
        threshold = result.get('threshold', 0.6)
        
        if score >= threshold:
            print("🎨 Result: AUTHENTIC")
        else:
            print("⚠️  Result: NOT AUTHENTIC")
        
        print("="*50)
        
        return result
        
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Error: Could not connect to {endpoint}")
        print("   Make sure the server is running:")
        print("   - Go API: http://localhost:8787")
        print("   - TorchServe: http://127.0.0.1:8080")
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(f"\n❌ HTTP Error: {e}")
        print(f"   Response: {e.response.text}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Test model prediction endpoint')
    parser.add_argument('image', nargs='?', help='Path to image file (optional)')
    parser.add_argument(
        '--endpoint',
        default='http://localhost:8787/model/predict',
        help='API endpoint URL (default: http://localhost:8787/model/predict)'
    )
    parser.add_argument(
        '--direct',
        action='store_true',
        help='Use direct TorchServe endpoint instead of Go API proxy'
    )
    
    args = parser.parse_args()
    
    if args.direct:
        endpoint = "http://127.0.0.1:8080/predictions/poar_detector"
    else:
        endpoint = args.endpoint
    
    test_model_prediction(args.image, endpoint)

if __name__ == "__main__":
    main()


