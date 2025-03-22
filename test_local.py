import sys
import os
import json

# Add debugging
print("Python version:", sys.version)
print("Python path:", sys.path)

# Add your Lambda function directory to the Python path
sys.path.append('cdk-infra/lambda/analysis')

try:
    # Try importing pandas to see if that works
    import pandas as pd
    print("Successfully imported pandas version:", pd.__version__)
    import numpy as np
    print("Successfully imported numpy version:", np.__version__)
except Exception as e:
    print("Import error:", str(e))

# Import your Lambda handler
try:
    from index import lambda_handler
    print("Successfully imported lambda_handler")
except Exception as e:
    print("Error importing lambda_handler:", str(e))
    sys.exit(1)

# Load the test event
with open('event.json', 'r') as f:
    event = json.load(f)

# Set up environment variables if needed
os.environ['PORTFOLIO_TABLE'] = 'dummy-table'
os.environ['POSITION_TABLE'] = 'dummy-table'

# Call the handler function
print("Calling lambda_handler with event:", json.dumps(event, indent=2))
try:
    response = lambda_handler(event, {})
    print("\nResponse:", json.dumps(response, indent=2))
except Exception as e:
    print("\nError calling lambda_handler:", str(e))
    import traceback
    traceback.print_exc()