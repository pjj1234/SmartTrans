# SmartTrans Deploy Script (Windows)
# Usage: .\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "===== 1/3 Install Dependencies ====="
npm run install:all
if ($LASTEXITCODE -ne 0) { throw "install failed" }

Write-Host "===== 2/3 Build Frontend ====="
npm run build
if ($LASTEXITCODE -ne 0) { throw "build failed" }

Write-Host "===== 3/3 Rebuild RAG Vector Store ====="
npm run rag:ingest
if ($LASTEXITCODE -ne 0) { throw "rag ingest failed" }

Write-Host ""
Write-Host "Deploy completed!"
Write-Host "Run: npm start"
Write-Host "Then visit: http://localhost:28123"
