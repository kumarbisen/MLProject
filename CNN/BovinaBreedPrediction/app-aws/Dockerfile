FROM python:3.9-slim

# Set workdir
WORKDIR /app

# Copy files
COPY ./* /app/


# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8080



# Run FastAPI with Uvicorn inside Lambda
CMD ["app.handler"]
