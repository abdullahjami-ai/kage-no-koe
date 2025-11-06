#!/bin/bash

# Kage no Koe Launch Script
# Starts both Flask backend and React frontend

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}🚀 Kage no Koe - LocalMind Launcher${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# ============= CHECK OLLAMA =============

echo -e "${YELLOW}📡 Checking Ollama...${NC}"
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${RED}❌ Ollama is not running!${NC}"
    echo -e "${YELLOW}⚡ Starting Ollama in background...${NC}"
    ollama serve > /dev/null 2>&1 &
    sleep 3

    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Ollama started${NC}"
    else
        echo -e "${RED}❌ Failed to start Ollama${NC}"
        echo -e "${YELLOW}Please run 'ollama serve' manually in another terminal${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Ollama is running${NC}"
fi

# ============= CHECK PYTHON VENV =============

echo -e "\n${YELLOW}🐍 Checking Python environment...${NC}"
if [ ! -d "venv" ]; then
    echo -e "${RED}❌ Virtual environment not found!${NC}"
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Activate virtual environment
source venv/bin/activate
echo -e "${GREEN}✅ Virtual environment activated${NC}"

# Check if dependencies are installed
echo -e "\n${YELLOW}📦 Checking backend dependencies...${NC}"
if ! python -c "import flask" 2>/dev/null; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    pip install -r requirements.txt
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Backend dependencies OK${NC}"
fi

# ============= CHECK NODE/NPM =============

echo -e "\n${YELLOW}📦 Checking frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies (this may take a few minutes)...${NC}"
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies OK${NC}"
fi

cd "$PROJECT_DIR"

# ============= START BACKEND =============

echo -e "\n${BLUE}======================================${NC}"
echo -e "${GREEN}🚀 Starting Flask Backend...${NC}"
echo -e "${BLUE}======================================${NC}"

# Start Flask in background
python -m backend.app > backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${YELLOW}   Logs: backend.log${NC}"

# Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready!${NC}"
        break
    fi
    sleep 1
done

# ============= START FRONTEND =============

echo -e "\n${BLUE}======================================${NC}"
echo -e "${GREEN}🚀 Starting React Frontend...${NC}"
echo -e "${BLUE}======================================${NC}"

cd "$PROJECT_DIR/frontend"

# Start Vite dev server in background
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "${YELLOW}   Logs: frontend.log${NC}"

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
echo -e "${YELLOW}🛑 To stop:${NC}"
echo -e "   kill $BACKEND_PID $FRONTEND_PID"
echo -e "   or press Ctrl+C and run: pkill -f 'backend.app' && pkill -f 'vite'"
echo -e ""

# Save PIDs for cleanup
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# Open browser after 2 seconds
(sleep 2 && xdg-open http://localhost:5173 2>/dev/null) &

echo -e "${GREEN}🎉 Ready! Opening browser...${NC}\n"

# Wait for user to stop
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
trap "echo -e '\n${YELLOW}🛑 Stopping services...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo -e '${GREEN}✅ Services stopped${NC}'; exit 0" INT

# Keep script running
wait
