# GitHub Actions Workflow Guide

This directory contains CI/CD workflows for the SDWAN Speed Test application.

## Workflows Overview

### 1. `test.yml` - E2E Test Suite
**Trigger**: Push/PR to master, main, develop branches
**Purpose**: Run Playwright end-to-end tests
**Duration**: ~5-10 minutes

**What it does**:
- Tests on Node.js 18 and 20
- Starts both Gold (8888) and Silver (8889) servers
- Runs full Playwright test suite
- Uploads test reports and traces
- Uses higher rate limits for CI environment

**Artifacts**:
- Playwright HTML reports (30 days)
- Test traces on failure (7 days)
- Server logs on failure (7 days)

### 2. `lint.yml` - Code Quality
**Trigger**: Push/PR to master, main, develop branches
**Purpose**: Run ESLint checks
**Duration**: ~1-2 minutes

**What it does**:
- Checks code style and quality
- Identifies potential bugs
- Enforces coding standards

### 3. `docker-build.yml` - Docker Build Validation
**Trigger**: Push/PR to master, main, develop branches
**Purpose**: Verify Docker builds work
**Duration**: ~3-5 minutes

**What it does**:
- Builds Docker image
- Starts container
- Tests health endpoints
- Validates dual-port setup

### 4. `security-scan.yml` - Security Audit
**Trigger**:
- Push/PR to master, main branches
- Weekly schedule (Mondays 9 AM UTC)
**Purpose**: Identify security vulnerabilities
**Duration**: ~2-3 minutes

**What it does**:
- Runs `npm audit`
- Scans for vulnerable dependencies
- Reports critical/high severity issues
- Creates weekly security reports

## Workflow Status Badges

Add these to your README.md:

```markdown
![Tests](https://github.com/ngriffin1978/speedtest/workflows/Playwright%20E2E%20Tests/badge.svg)
![Lint](https://github.com/ngriffin1978/speedtest/workflows/Lint%20Code/badge.svg)
![Docker](https://github.com/ngriffin1978/speedtest/workflows/Docker%20Build%20Test/badge.svg)
![Security](https://github.com/ngriffin1978/speedtest/workflows/Security%20Scan/badge.svg)
```

## Running Workflows Locally

### Test Workflow (Act)
```bash
# Install act (GitHub Actions local runner)
# brew install act  # macOS
# sudo apt install act  # Ubuntu

# Run test workflow locally
act push -j test
```

### Manual Test Run
```bash
# Simulate CI environment
export CI=true
export DATA_CENTER_ID=LOCAL-TEST
export RATE_LIMIT_MAX_REQUESTS=1000

# Start server
npm start &

# Wait for servers
sleep 5

# Run tests
npm run test:e2e
```

## Customization

### Adjust Test Timeout
Edit `test.yml`:
```yaml
jobs:
  test:
    timeout-minutes: 15  # Change this value
```

### Change Test Triggers
Edit any workflow file:
```yaml
on:
  push:
    branches: [master, main, develop, feature/*]  # Add branches
  pull_request:
    branches: [master, main]
```

### Add Test Matrix
Edit `test.yml` to test more configurations:
```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
    os: [ubuntu-latest, windows-latest]  # Add OS variants
```

## Environment Variables in CI

The test workflow creates `.env.test` with these settings:

```bash
# Higher limits for CI
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_PER_IP_CONCURRENT=20
MAX_CONCURRENT_TESTS=50

# Unique datacenter ID per run
DATA_CENTER_ID=CI-GITHUB-{run_number}

# Test mode
NODE_ENV=test
```

## Secrets Configuration

If you need to add secrets (API keys, credentials):

1. Go to: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add your secret

Then use in workflows:
```yaml
env:
  API_KEY: ${{ secrets.API_KEY }}
```

## Viewing Test Results

### In GitHub UI
1. Go to Actions tab
2. Click on workflow run
3. Scroll to "Artifacts" section
4. Download "playwright-report"
5. Open `index.html` in browser

### Automatic Comments (Optional)
Add this step to post results as PR comments:
```yaml
- name: Comment PR with results
  uses: daun/playwright-report-comment@v3
  if: always()
  with:
    report-path: playwright-report
```

## Troubleshooting

### Tests timeout
- Increase `timeout-minutes` in workflow
- Check server startup logs
- Verify health endpoint responses

### Rate limiting in CI
- Already configured with higher limits
- If still hitting limits, increase `RATE_LIMIT_MAX_REQUESTS`

### Docker build fails
- Check Dockerfile exists
- Verify Docker context is correct
- Check for missing dependencies

### Security scan reports vulnerabilities
- Review audit results artifact
- Run `npm audit fix` locally
- Update dependencies
- Check if vulnerabilities are in dev dependencies only

## Best Practices

1. **Keep workflows fast** - Tests should complete in < 10 minutes
2. **Use caching** - npm cache is already enabled
3. **Fail fast** - Set `fail-fast: false` to see all failures
4. **Upload artifacts** - Always upload on failure for debugging
5. **Use matrix sparingly** - Only test configurations you support
6. **Monitor costs** - GitHub gives 2000 free minutes/month for private repos

## Maintenance

### Weekly Tasks
- Review Dependabot PRs
- Check security scan results
- Monitor test flakiness

### Monthly Tasks
- Review workflow execution times
- Optimize slow tests
- Update GitHub Actions versions
- Review artifact retention policies

## Getting Help

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Playwright CI Docs**: https://playwright.dev/docs/ci
- **Test Plan**: See `/TEST_PLAN.md`
- **Test Status**: See `/TESTING_STATUS.md`

## Workflow Diagram

```
┌─────────────────┐
│  Push/PR Event  │
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────────┐
    │         │        │            │
    ▼         ▼        ▼            ▼
┌──────┐ ┌──────┐ ┌──────────┐ ┌──────────┐
│ Test │ │ Lint │ │  Docker  │ │ Security │
│      │ │      │ │   Build  │ │   Scan   │
└───┬──┘ └───┬──┘ └────┬─────┘ └────┬─────┘
    │        │         │            │
    ▼        ▼         ▼            ▼
┌────────────────────────────────────────┐
│      All Checks Must Pass for PR       │
│         (except lint - warning)         │
└────────────────────────────────────────┘
```

---

**Last Updated**: 2026-02-11
**Maintained By**: DevOps/QA Team
