#!/bin/bash
# Login
echo "Logging in..."
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@acme.com", "password": "password"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Use Seeded Org ID
ORG_ID="11111111-1111-1111-1111-111111111111"

# Create Project
echo "Creating Project in Org $ORG_ID..."
PROJ_RES=$(curl -s -X POST http://localhost:4000/api/orgs/$ORG_ID/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Data Project"}')
PROJ_ID=$(echo $PROJ_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Project ID: $PROJ_ID"

# Create Dummy CSV
echo "col1,col2\nval1,val2" > test.csv

# Upload Dataset
echo "Uploading Dataset..."
UPLOAD_RES=$(curl -s -X POST http://localhost:4000/api/projects/$PROJ_ID/datasets \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.csv")
DATASET_ID=$(echo $UPLOAD_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Dataset ID: $DATASET_ID"

# Wait for Cleaning (mock wait)
echo "Waiting for Cleaning..."
sleep 5

# Trigger Transformation
echo "Triggering Transformation..."
curl -X POST http://localhost:4000/api/projects/$PROJ_ID/datasets/$DATASET_ID/transform \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"transformations": ["encode", "scale"]}'

# Wait for Transformation (mock wait)
echo "\nWaiting for Transformation..."
sleep 6

# Check Final Status
echo "\nChecking Final Status..."
docker exec docker-postgres-1 psql -U postgres -d active_check -c "SELECT id, status FROM datasets WHERE id = '$DATASET_ID';"

# Check Logs
echo "\nChecking Logs..."
docker exec docker-postgres-1 psql -U postgres -d active_check -c "SELECT step_name, status, message FROM cleaning_logs WHERE dataset_id = '$DATASET_ID' ORDER BY created_at;"

# Check EDA Results
echo "\nChecking EDA Results..."
docker exec docker-postgres-1 psql -U postgres -d active_check -c "SELECT results FROM eda_results WHERE dataset_id = '$DATASET_ID';"
