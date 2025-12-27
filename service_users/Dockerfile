# Use a slim version of Python to keep the image lightweight
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies (needed for some Python packages like psycopg2)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# We copy only requirements.txt first to leverage Docker's cache layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY /app .

# Command to run the application
# We use Flask's development server for hot-reloading (specified in docker-compose)
CMD ["python", "app.py"]

# docker build -t users-service-backend .
# docker run -it --rm --name users-service -p 5000:5000 users-service-backend
