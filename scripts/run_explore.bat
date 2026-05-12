@echo off
REM run_explore.bat — Windows launcher for the 12-hour autonomous explore.
REM
REM Usage:
REM   scripts\run_explore.bat                    rem 12 hours, headless
REM   scripts\run_explore.bat --hours 1          rem short test run
REM   scripts\run_explore.bat --headed           rem watch the browser
REM
REM Output goes under data\explore_runs\<timestamp>. The script will print
REM the directory name; tail run.log inside it to watch progress.

setlocal
cd /d "%~dp0\.."

for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value ^| find "="') do set DT=%%a
set STAMP=%DT:~0,8%_%DT:~8,6%

set OUTDIR=data\explore_runs\%STAMP%
if not exist "%OUTDIR%" mkdir "%OUTDIR%"

set LOGFILE=%OUTDIR%\run.log

echo Starting explore. Logs streaming to %LOGFILE%
echo Tail with: type %LOGFILE%
echo.

REM Use start /b to background. The window stays open; close it to terminate.
start "rubli-explore" /b cmd /c python scripts\automated_explore.py --out "%OUTDIR%" %* ^> "%LOGFILE%" 2^>^&1

echo Launched. Output dir: %OUTDIR%
echo To stop: find the python process in Task Manager or run:
echo     taskkill /F /IM python.exe
endlocal
