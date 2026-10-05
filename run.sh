#!/bin/bash

# K6 Performance Test Runner

show_help() {
    echo ""
    echo "K6 Performance Test Runner"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  api          Run API performance test"
    echo "  ui           Run UI performance test"
    echo "  all          Run both API and UI tests"
    echo "  api-cloud    Run API test and upload to K6 Cloud"
    echo "  ui-cloud     Run UI test and upload to K6 Cloud"
    echo ""
    echo "Options:"
    echo "  --env ENV           Set environment: dev, staging, production (default: dev)"
    echo "  --users N           Set virtual users (default: 10)"
    echo "  --duration Ns       Set duration in seconds (default: 30)"
    echo "  --url URL           Set target URL"
    echo "  --ramp Ns           Set ramp-up time in seconds (default: 10)"
    echo "  --config PATH       Set custom config file path"
    echo ""
    echo "Examples:"
    echo "  $0 api --env staging"
    echo "  $0 api --env production --users 5"
    echo "  $0 ui --users 10"
    echo "  $0 all --env dev --users 50"
    echo ""
}

if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "Error: k6 is not installed. Please install k6 from https://k6.io/docs/getting-started/installation/"
    exit 1
fi

TEST_CMD=$1
shift

EXTRA_ARGS=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            EXTRA_ARGS="$EXTRA_ARGS -e ENVIRONMENT=$2"
            shift 2
            ;;
        --users)
            EXTRA_ARGS="$EXTRA_ARGS -e VIRTUAL_USERS=$2"
            shift 2
            ;;
        --duration)
            EXTRA_ARGS="$EXTRA_ARGS -e DURATION=${2}s"
            shift 2
            ;;
        --url)
            EXTRA_ARGS="$EXTRA_ARGS -e API_URL=$2 -e UI_URL=$2"
            shift 2
            ;;
        --ramp)
            EXTRA_ARGS="$EXTRA_ARGS -e RAMP_UP=${2}s"
            shift 2
            ;;
        --config)
            EXTRA_ARGS="$EXTRA_ARGS -e CONFIG_FILE=$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Execute test command
case $TEST_CMD in
    api)
        echo "Running API Performance Test..."
        k6 run $EXTRA_ARGS tests/api.js
        ;;
    ui)
        echo "Running UI Performance Test..."
        k6 run $EXTRA_ARGS tests/ui.js
        ;;
    all)
        echo "Running API Performance Test..."
        k6 run $EXTRA_ARGS tests/api.js
        echo ""
        echo "Running UI Performance Test..."
        k6 run $EXTRA_ARGS tests/ui.js
        ;;
    api-cloud)
        echo "Uploading API test to K6 Cloud..."
        k6 cloud $EXTRA_ARGS tests/api.js
        ;;
    ui-cloud)
        echo "Uploading UI test to K6 Cloud..."
        k6 cloud $EXTRA_ARGS tests/ui.js
        ;;
    *)
        echo "Unknown command: $TEST_CMD"
        show_help
        exit 1
        ;;
esac
