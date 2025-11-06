#!/bin/bash

# Kage no Koe Launch Script
# Run this from the project root directory: ./launch.sh

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}🚀 Kage no Koe - LocalMind Launcher${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo -e "${YELLOW}📂 Project directory: ${SCRIPT_DIR}${NC}\n"

# Change to project directory
cd "$SCRIPT_DIR"

# ============= CHECK PYTHON =============

echo -e "${YELLOW}🐍 Checking Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 is not installed!${NC}"
    echo -e "${YELLOW}Please install Python 3.10 or higher${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✅ ${PYTHON_VERSION}${NC}"

# ============= VIRTUAL ENVIRONMENT =============

echo -e "\n${YELLOW}🔧 Checking virtual environment...${NC}"

if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Virtual environment not found. Creating...${NC}"
    python3 -m venv venv

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Virtual environment created successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to create virtual environment${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}🔌 Activating virtual environment...${NC}"
source venv/bin/activate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Virtual environment activated${NC}"
else
    echo -e "${RED}❌ Failed to activate virtual environment${NC}"
    exit 1
fi

# ============= INSTALL PYTHON DEPENDENCIES =============

echo -e "\n${YELLOW}📦 Installing/Updating Python dependencies...${NC}"
pip install -r requirements.txt -q

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Python dependencies installed successfully!${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# ============= CHECK NODE.JS =============

echo -e "\n${YELLOW}📦 Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo -e "${YELLOW}Please install Node.js 18+ from: https://nodejs.org${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION}${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm ${NPM_VERSION}${NC}"

# ============= INSTALL FRONTEND DEPENDENCIES =============

echo -e "\n${YELLOW}📦 Checking frontend dependencies...${NC}"
cd "${SCRIPT_DIR}/frontend"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📥 Installing frontend dependencies (this may take a few minutes)...${NC}"
    npm install

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend dependencies installed successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Frontend dependencies already installed${NC}"
fi

cd "$SCRIPT_DIR"

# ============= CHECK OLLAMA =============

echo -e "\n${YELLOW}🤖 Checking Ollama...${NC}"

if ! command -v ollama &> /dev/null; then
    echo -e "${RED}❌ Ollama is not installed!${NC}"
    echo -e "${YELLOW}Please install Ollama from: https://ollama.com${NC}"
    exit 1
fi

# Check if Ollama server is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${RED}❌ Ollama server is not running!${NC}"
    echo -e "${YELLOW}⚡ Starting Ollama in background...${NC}"

    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!

    # Wait for Ollama to start
    echo -e "${YELLOW}⏳ Waiting for Ollama to start...${NC}"
    for i in {1..10}; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Ollama started successfully!${NC}"
            break
        fi
        sleep 1
    done

    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${RED}❌ Failed to start Ollama${NC}"
        echo -e "${YELLOW}Please run 'ollama serve' manually in another terminal${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Ollama is already running${NC}"
fi

# ============= CHECK MODEL =============

echo -e "\n${YELLOW}🧠 Checking Llama model...${NC}"

MODEL_NAME="llama3.2:1b"
if ollama list | grep -q "$MODEL_NAME"; then
    echo -e "${GREEN}✅ Model $MODEL_NAME is available${NC}"
else
    echo -e "${RED}❌ Model $MODEL_NAME not found!${NC}"
    echo -e "${YELLOW}📥 Downloading model (this may take a few minutes)...${NC}"
    ollama pull $MODEL_NAME

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Model downloaded successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to download model${NC}"
        exit 1
    fi
fi

# ============= START BACKEND =============

echo -e "\n${BLUE}======================================${NC}"
echo -e "${GREEN}🚀 Starting Flask Backend...${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Start Flask in background
python -m backend.app > backend.log 2>&1 &
BACKEND_PID=$!

echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${YELLOW}📋 Logs: backend.log${NC}"

# Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
for i in {1..15}; do
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready!${NC}"
        break
    fi
    sleep 1

    if [ $i -eq 15 ]; then
        echo -e "${RED}❌ Backend failed to start. Check backend.log${NC}"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
done

# ============= START FRONTEND =============

echo -e "\n${BLUE}======================================${NC}"
echo -e "${GREEN}🚀 Starting React Frontend...${NC}"
echo -e "${BLUE}======================================${NC}\n"

cd "${SCRIPT_DIR}/frontend"

# Start Vite dev server in background
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

cd "$SCRIPT_DIR"

echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "${YELLOW}📋 Logs: frontend.log${NC}"

# Wait for frontend to be ready
echo -e "${YELLOW}⏳ Waiting for frontend to be ready...${NC}"
sleep 3

# ============= SUMMARY =============

echo -e "\n${BLUE}======================================${NC}"
echo -e "${GREEN}✅ Kage no Koe is Running!${NC}"
echo -e "${BLUE}======================================${NC}\n"

echo -e "${GREEN}🌐 Backend:  ${NC}http://localhost:5000"
echo -e "${GREEN}🎨 Frontend: ${NC}http://localhost:5173"
echo -e "${GREEN}🤖 Ollama:   ${NC}http://localhost:11434"
echo -e ""
echo -e "${YELLOW}📋 Process IDs:${NC}"
echo -e "   Backend:  $BACKEND_PID"
echo -e "   Frontend: $FRONTEND_PID"
echo -e ""
echo -e "${YELLOW}🛑 To stop all services:${NC}"
echo -e "   kill $BACKEND_PID $FRONTEND_PID"
echo -e "   or press Ctrl+C"
echo -e ""

# Save PIDs
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# Try to open frontend in browser
echo -e "${YELLOW}🌐 Opening frontend in browser...${NC}"
sleep 2
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5173" 2>/dev/null &
elif command -v open &> /dev/null; then
    open "http://localhost:5173" 2>/dev/null &
else
    echo -e "${YELLOW}⚠️  Could not auto-open browser.${NC}"
    echo -e "${YELLOW}   Open manually: http://localhost:5173${NC}"
fi

echo -e "\n${GREEN}🎉 Ready! Your AI assistant is running!${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Trap Ctrl+C to stop both services
trap "echo -e '\n${YELLOW}🛑 Stopping services...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo -e '${GREEN}✅ All services stopped${NC}'; exit 0" INT TERM

# Keep script running
wait
