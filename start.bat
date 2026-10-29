@echo off
title ANALYSIS THE TEXTS - server
cd /d "%~dp0"
if not exist node_modules call npm install
node server.js
pause
