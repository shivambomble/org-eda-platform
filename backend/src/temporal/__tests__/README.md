# Temporal Workflow Tests

Comprehensive test suite for Temporal workflows and activities.

## Setup

Install test dependencies:
```bash
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

### Workflow Tests (`workflows.test.ts`)
- ✅ Clean dataset workflow success
- ✅ Clean dataset workflow with dataset not found error
- ✅ Clean dataset workflow with retry on transient errors
- ✅ Transform dataset workflow success
- ✅ Transform dataset workflow with transformation failure
- ✅ Transform dataset workflow with EDA failure
- ✅ Transform dataset workflow with dataset not found (no retry)
- ✅ Retry policy respects maximum attempts
- ✅ Retry policy uses exponential backoff

### Activity Tests (`activities.test.ts`)
- ✅ Clean dataset activity success
- ✅ Clean dataset activity with dataset not found
- ✅ Clean dataset activity with transformation errors
- ✅ Transform dataset activity success
- ✅ Transform dataset activity stores metadata
- ✅ Perform EDA activity success
- ✅ Perform EDA calculates correct stock status
- ✅ Perform EDA calculates correct inventory value
- ✅ Perform EDA generates low stock alerts

## Test Structure

```
__tests__/
├── workflows.test.ts    # Workflow orchestration tests
├── activities.test.ts   # Activity logic tests
└── README.md           # This file
```

## Key Test Scenarios

### 1. Happy Path
- Dataset upload → Clean → Transform → EDA → Results stored

### 2. Error Handling
- Dataset not found (permanent failure, no retry)
- Transformation errors (retry with backoff)
- EDA analysis failures

### 3. Retry Logic
- Transient errors trigger retries
- Permanent errors don't retry
- Maximum 5 retry attempts
- Exponential backoff between retries

### 4. Data Accuracy
- Stock status calculations
- Inventory value calculations
- Low stock alert generation
- Category/supplier distributions

## Mocking Strategy

- **Database**: Mocked with `jest.mock('../../db')`
- **Data Transform**: Mocked with `jest.mock('../../lib/dataTransform')`
- **Temporal**: Uses `@temporalio/testing` for workflow testing

## Test Configuration

The tests are configured with:
- 30 second timeout per test
- Single worker (maxWorkers: 1) to avoid conflicts
- Force exit enabled to handle any remaining async operations
- Proper worker shutdown in finally blocks with `await worker.shutdown()`
- Unique task queues per test to prevent interference
- Mock cleanup in afterEach hooks with `jest.restoreAllMocks()`

## Resource Management

All tests properly manage resources:
- Workers are shut down gracefully after each test
- Test environment is torn down in afterAll
- Mocks are restored after each test
- Unique task queues prevent test interference

## Coverage Goals

- **Workflows**: 100% coverage
- **Activities**: 90%+ coverage
- **Error paths**: All error scenarios tested
- **Retry logic**: All retry scenarios tested

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Run Tests
  run: npm test

- name: Check Coverage
  run: npm run test:coverage
```

## Debugging Tests

Run specific test file:
```bash
npm test workflows.test.ts
```

Run specific test:
```bash
npm test -t "should successfully clean a dataset"
```

Enable verbose output:
```bash
npm test -- --verbose
```
