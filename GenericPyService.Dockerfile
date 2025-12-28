# Use a slim version of Python to keep the image lightweight
FROM python:3.11-alpine

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies
# 1. build-base is the Alpine equivalent of build-essential
# 2. postgresql-dev provides the headers for psycopg2
# 3. libpq is the runtime library for PostgreSQL
RUN apk add --no-cache postgresql-dev build-base libpq

# Install Python dependencies
ARG SERVICE_DIR

# Copy requirements first to leverage Docker cache
COPY ./${SERVICE_DIR}/requirements.txt .

# Install dependencies and then remove build tools to keep the image small
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY ./${SERVICE_DIR}/app .

# Command to run the application
CMD ["python", "app.py"]
