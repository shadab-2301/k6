@echo off
REM K6 Performance Test Runner for Windows

setlocal enabledelayedexpansion

if "%1%"=="" (
    echo.
    echo K6 Performance Test Runner
    echo.
    echo Usage: run.bat [command]
    echo.
    echo Commands:
    echo   api         Run API performance test
    echo   ui          Run UI performance test
    echo   all         Run both API and UI tests
    echo   api-cloud   Run API test and upload to K6 Cloud
    echo   ui-cloud    Run UI test and upload to K6 Cloud
    echo.
    echo Options (append to command):
    echo   --env ENV           Set environment: dev, staging, production (default: dev)
    echo   --users N           Set virtual users (default: 10)
    echo   --duration Ns       Set duration in seconds (default: 30)
    echo   --url URL           Set target URL
    echo   --config PATH       Set custom config file path
    echo.
    echo Examples:
    echo   run.bat api --env staging
    echo   run.bat api --env production --users 5
    echo   run.bat ui --users 10
    echo   run.bat all --env dev --users 50
    echo.
    goto end
)

set TEST_CMD=%1%
shift

REM Parse options
set EXTRA_ARGS=

:parse_args
if "%1%"=="" goto run_test
if "%1%"=="--env" (
    set "EXTRA_ARGS=!EXTRA_ARGS! -e ENVIRONMENT=%2%"
    shift
    shift
    goto parse_args
)
if "%1%"=="--users" (
    set "EXTRA_ARGS=!EXTRA_ARGS! -e VIRTUAL_USERS=%2%"
    shift
    shift
    goto parse_args
)
if "%1%"=="--duration" (
    set "EXTRA_ARGS=!EXTRA_ARGS! -e DURATION=%2%"
    shift
    shift
    goto parse_args
)
if "%1%"=="--url" (
    set "EXTRA_ARGS=!EXTRA_ARGS! -e API_URL=%2% -e UI_URL=%2%"
    shift
    shift
    goto parse_args
)
if "%1%"=="--config" (
    set "EXTRA_ARGS=!EXTRA_ARGS! -e CONFIG_FILE=%2%"
    shift
    shift
    goto parse_args
)
shift
goto parse_args

:run_test
if "%TEST_CMD%"=="api" (
    echo Running API Performance Test...
    k6 run !EXTRA_ARGS! tests/api.js
    goto end
)

if "%TEST_CMD%"=="ui" (
    echo Running UI Performance Test...
    k6 run !EXTRA_ARGS! tests/ui.js
    goto end
)

if "%TEST_CMD%"=="all" (
    echo Running API Performance Test...
    k6 run !EXTRA_ARGS! tests/api.js
    echo.
    echo Running UI Performance Test...
    k6 run !EXTRA_ARGS! tests/ui.js
    goto end
)

if "%TEST_CMD%"=="api-cloud" (
    echo Uploading API test to K6 Cloud...
    k6 cloud !EXTRA_ARGS! tests/api.js
    goto end
)

if "%TEST_CMD%"=="ui-cloud" (
    echo Uploading UI test to K6 Cloud...
    k6 cloud !EXTRA_ARGS! tests/ui.js
    goto end
)

echo Unknown command: %TEST_CMD%
echo Run 'run.bat' without arguments for help

:end
endlocal
