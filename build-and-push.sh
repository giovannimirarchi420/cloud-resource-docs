#!/bin/bash

# Configuration
REGISTRY="docker.io/g420"  # Change this to your Docker Hub username
IMAGE_NAME=prognose-docs

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Extract version from package.json
VERSION=$(grep -o '"version": "[^"]*' package.json | cut -d'"' -f4)
if [ -z "$VERSION" ]; then
  echo "Error: Could not extract version from package.json"
  exit 1
fi

echo "Extracted version $VERSION from package.json"

# Set image tags
VERSION_TAG="$REGISTRY/$IMAGE_NAME:$VERSION"
LATEST_TAG="$REGISTRY/$IMAGE_NAME:latest"

echo -e "${GREEN}Building Docker image...${NC}"
docker build -t $VERSION_TAG -t $LATEST_TAG .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully built images:${NC}"
    echo -e "  - $VERSION_TAG"
    echo -e "  - $LATEST_TAG"
    
    echo -e "${GREEN}Pushing images to registry: $REGISTRY${NC}"
    
    # Push version tag
    echo -e "${YELLOW}Pushing $VERSION_TAG...${NC}"
    docker push $VERSION_TAG
    VERSION_PUSH_STATUS=$?
    
    # Push latest tag
    echo -e "${YELLOW}Pushing $LATEST_TAG...${NC}"
    docker push $LATEST_TAG
    LATEST_PUSH_STATUS=$?
    
    if [ $VERSION_PUSH_STATUS -eq 0 ] && [ $LATEST_PUSH_STATUS -eq 0 ]; then
        echo -e "${GREEN}Successfully pushed all images${NC}"
    else
        echo -e "${RED}Failed to push one or more images${NC}"
        exit 1
    fi
else
    echo -e "${RED}Failed to build images${NC}"
    exit 1
fi

echo -e "${GREEN}Images are now available at:${NC}"
echo -e "  - $VERSION_TAG"
echo -e "  - $LATEST_TAG"