import torch
from PIL import Image
from torchvision import transforms
import json
import io
import os

class DetectorHandler:
    def __init__(self):
        self.initialized = False
        self.model = None
        self.device = None
        self.threshold = 0.6
        self.transform = None

    def initialize(self, ctx):
        """
        Initialize the model handler.
        ctx provides model files and properties from TorchServe.
        """
        # Get model files from context
        model_dir = ctx.system_properties.get("model_dir")
        model_file = ctx.model_yaml_config.get("handler", {}).get("model_file", "detector_torchscript_local.pt")
        metadata_file = ctx.model_yaml_config.get("handler", {}).get("metadata_file", "metadata_local.json")
        
        # Use provided paths or fallback to current directory
        model_path = os.path.join(model_dir, model_file) if model_dir else model_file
        metadata_path = os.path.join(model_dir, metadata_file) if model_dir else metadata_file
        
        # Set device
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Load model
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        self.model = torch.jit.load(model_path, map_location=self.device)
        self.model.eval()
        
        # Load metadata
        if os.path.exists(metadata_path):
            with open(metadata_path) as f:
                meta = json.load(f)
            self.threshold = meta.get("threshold", 0.6)
        else:
            print(f"Warning: Metadata file not found at {metadata_path}, using default threshold")
        
        # Setup transforms
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor()
        ])
        
        self.initialized = True
        print(f"✅ Model initialized on {self.device} with threshold {self.threshold}")

    def preprocess(self, data):
        """Preprocess image data."""
        # TorchServe sends data as list of requests
        if isinstance(data, list):
            # Get image bytes from request
            image_bytes = data[0].get("body") or data[0].get("data")
            if image_bytes is None:
                raise ValueError("No image data found in request")
        else:
            image_bytes = data
        
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = self.transform(image).unsqueeze(0).to(self.device)
        return tensor

    def inference(self, tensor):
        """Run model inference."""
        with torch.no_grad():
            out = self.model(tensor)
            score = torch.sigmoid(out).item()
        return score

    def postprocess(self, score):
        """Postprocess inference results."""
        return {
            "authenticity_score": round(score, 4),
            "threshold": self.threshold,
            "status": "AUTHENTIC" if score >= self.threshold else "NOT AUTHENTIC"
        }

    def handle(self, data, context):
        """Main handler method called by TorchServe."""
        if not self.initialized:
            self.initialize(context)
        
        # Preprocess
        tensor = self.preprocess(data)
        
        # Inference
        score = self.inference(tensor)
        
        # Postprocess
        result = self.postprocess(score)
        
        return [result]
