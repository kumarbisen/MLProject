import logging
from google.cloud import storage
import tensorflow as tf
import numpy as np
from PIL import Image
import os

BUCKET_NAME = "breed-classification-kumarbisen"
MODEL_FILE = "/tmp/model.h5"

class_names = ['Alambadi', 'Amritmahal', 'Ayrshire', 'Banni']  # Truncate for now

model = None

def download_model():
    logging.info("Downloading model from GCS...")
    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob("models/model.h5")
    blob.download_to_filename(MODEL_FILE)
    logging.info("Model saved to /tmp/model.h5")

def preprocess_image(file):
    logging.info("Preprocessing image...")
    image = Image.open(file).convert("RGB")
    image = image.resize((256, 256))
    image = np.array(image) / 255.0
    image = np.expand_dims(image, axis=0)
    return image

def predict(request):
    global model

    logging.info("Received a request")

    try:
        if "file" not in request.files:
            logging.error("File missing in request")
            return {"error": "Missing file"}, 400

        if not os.path.exists(MODEL_FILE):
            download_model()

        if model is None:
            logging.info("Loading model...")
            model = tf.keras.models.load_model(MODEL_FILE)
            logging.info("Model loaded")

        file = request.files["file"]
        img = preprocess_image(file)

        logging.info("Making prediction...")
        prediction = model.predict(img)
        predicted_class = class_names[np.argmax(prediction[0])]
        confidence = round(float(np.max(prediction[0]) * 100), 2)

        return {
            "class": predicted_class,
            "confidence": confidence
        }

    except Exception as e:
        logging.exception("Prediction failed due to exception")
        return {"error": str(e)}, 500
