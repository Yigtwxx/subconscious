import os
import sys
import subprocess
import time

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    is_windows = sys.platform.startswith("win")

    # Virtual environment Python executable path
    if is_windows:
        venv_python = os.path.join(root_dir, ".venv", "Scripts", "python.exe")
        npm_cmd = "npm.cmd"
    else:
        venv_python = os.path.join(root_dir, ".venv", "bin", "python")
        npm_cmd = "npm"

    # Check if venv python exists
    if not os.path.exists(venv_python):
        print("Hata: .venv dizini bulunamadı! Lütfen önce sanal ortamı kurun.")
        print("Mac/Linux: python3 -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt")
        print("Windows: python -m venv .venv && .venv\\Scripts\\activate && pip install -r backend/requirements.txt")
        sys.exit(1)

    # Check if node_modules exists
    if not os.path.exists(os.path.join(root_dir, "frontend", "node_modules")):
        print("Hata: frontend/node_modules bulunamadı! Lütfen npm bağımlılıklarını yükleyin.")
        print("Önce: cd frontend && npm install")
        sys.exit(1)

    print("🚀 Subconscious Geliştirme Ortamı Başlatılıyor...")
    print("-------------------------------------------------")
    print("1. Backend (FastAPI @ port 3000) başlatılıyor...")
    
    # Start Backend
    backend_script = os.path.join(root_dir, "backend", "server.py")
    backend_process = subprocess.Popen(
        [venv_python, backend_script],
        cwd=os.path.join(root_dir, "backend")
    )

    time.sleep(2)  # Wait a bit for backend to start

    print("2. Frontend (Next.js @ port 3001 proxying to 3000) başlatılıyor...")
    
    # Start Frontend
    frontend_dir = os.path.join(root_dir, "frontend")
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "-p", "3001"],
        cwd=frontend_dir
    )

    print("-------------------------------------------------")
    print("✅ Geliştirme ortamı hazır! Çıkmak için CTRL+C yapabilirsiniz.")
    print("-------------------------------------------------")

    try:
        # Keep the main thread alive, waiting for processes
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\nÇıkış yapılıyor, sunucular kapatılıyor...")
        backend_process.terminate()
        frontend_process.terminate()
        backend_process.wait()
        frontend_process.wait()
        print("Güle güle! 👋")

if __name__ == "__main__":
    main()
