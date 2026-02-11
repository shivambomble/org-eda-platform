# OrgEDA Platform - Start Here

Welcome! Your OrgEDA platform is ready for deployment on AWS EC2.

---

## What is OrgEDA?

OrgEDA is a complete data analysis platform with:
- React frontend for data visualization
- Node.js backend API
- PostgreSQL database
- Hasura GraphQL engine
- Temporal workflow engine
- AWS S3 storage integration

---

## Quick Facts

```
Cost:       $28.35/month (8 hours/day)
Setup:      2-3 hours
Hosting:    AWS EC2 (4 instances)
Database:   RDS Aurora
Storage:    S3
```

---

## I Want to Deploy

### Option 1: First Time Deploying (Recommended)

**Time**: 3-4 hours total

1. Read: `DEPLOYMENT_READY.md` (5 min)
   - Overview of what you're deploying
   - Architecture explanation
   - Cost breakdown

2. Prepare: AWS Environment (30 min)
   - Create AWS account
   - Create IAM user
   - Install AWS CLI
   - Configure credentials

3. Deploy: Follow `AWS_EC2_DEPLOYMENT_CHECKLIST.md` (2-3 hours)
   - Step-by-step instructions
   - Copy-paste commands
   - Checkboxes for tracking

4. Verify: Run `./scripts/status.sh`
   - Check all services are running
   - Access your application

### Option 2: Quick Deployment (Experienced Users)

**Time**: 1-2 hours

1. Skim: `AWS_EC2_QUICK_REFERENCE.md` (5 min)
2. Follow: `AWS_EC2_DEPLOYMENT_CHECKLIST.md` (1-2 hours)
3. Verify: `./scripts/status.sh`

---

## I Need Help

### Something Broken?

1. Check status: `./scripts/status.sh`
2. Read: `AWS_EC2_TROUBLESHOOTING.md`
3. Find your issue and follow solution

### Need Quick Commands?

See: `AWS_EC2_QUICK_REFERENCE.md`

### Need Full Details?

See: `AWS_EC2_ONLY_DEPLOYMENT.md`

---

## Documentation Map

```
START HERE
    ↓
DEPLOYMENT_READY.md (Overview)
    ↓
AWS_EC2_DEPLOYMENT_CHECKLIST.md (Step-by-step)
    ↓
AWS_EC2_ONLY_DEPLOYMENT.md (Details)
    ↓
AWS_EC2_QUICK_REFERENCE.md (Quick lookup)
    ↓
AWS_EC2_TROUBLESHOOTING.md (When stuck)
```

---

## Key Files

### Documentation

| File | Purpose | Time |
|------|---------|------|
| `DEPLOYMENT_READY.md` | Overview and getting started | 5 min |
| `AWS_EC2_DEPLOYMENT_CHECKLIST.md` | Step-by-step deployment | 2-3 hours |
| `AWS_EC2_ONLY_DEPLOYMENT.md` | Detailed reference | Reference |
| `AWS_EC2_QUICK_REFERENCE.md` | Quick commands | Reference |
| `AWS_EC2_TROUBLESHOOTING.md` | Troubleshooting | Reference |
| `DEPLOYMENT_INDEX.md` | Documentation index | Reference |

### Scripts

| File | Purpose |
|------|---------|
| `scripts/start-all.sh` | Start all services |
| `scripts/stop-all.sh` | Stop all services |
| `scripts/status.sh` | Check service status |
| `scripts/README.md` | Script documentation |

---

## Next Steps

### Right Now

1. Read `DEPLOYMENT_READY.md` (5 minutes)
2. Decide if you want to deploy

### If Yes

1. Prepare AWS environment (30 minutes)
2. Follow `AWS_EC2_DEPLOYMENT_CHECKLIST.md` (2-3 hours)
3. Verify with `./scripts/status.sh`

### After Deployment

1. Access your application
2. Test the features
3. Set up automated start/stop
4. Monitor costs

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              AWS EC2 Only Deployment                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  EC2 Instance 1: Frontend + Backend                    │
│  EC2 Instance 2: Hasura GraphQL Engine                 │
│  EC2 Instance 3: Temporal Server                       │
│  EC2 Instance 4: Temporal Worker                       │
│  RDS Aurora: PostgreSQL Database                       │
│  S3: Dataset Storage                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Cost Breakdown

```
EC2 Instance 1 (Frontend + Backend):  $2.50/month
EC2 Instance 2 (Hasura):              $2.50/month
EC2 Instance 3 (Temporal Server):     $2.50/month
EC2 Instance 4 (Temporal Worker):     $2.50/month
RDS Aurora:                           $14.40/month
S3 Storage:                           $3-4.00/month
Data Transfer:                        $0.45/month
─────────────────────────────────────────────────
TOTAL (8h/day):                       $28.35/month
TOTAL (24h/day):                      $77.70/month
```

---

## Daily Operations

### Morning: Start Services

```bash
./scripts/start-all.sh
```

### Throughout Day: Monitor

```bash
./scripts/status.sh
```

### Evening: Stop Services

```bash
./scripts/stop-all.sh
```

---

## Access Points

After deployment, access:

| Service | URL |
|---------|-----|
| Frontend | `http://instance1-ip` |
| Backend API | `http://instance1-ip:4000` |
| Hasura Console | `http://hasura-ip:8080/console` |
| Temporal UI | `http://temporal-server-ip:8233` |

---

## Common Questions

### How much does it cost?

$28.35/month if you run 8 hours/day, or $77.70/month if you run 24/7.

### How long does deployment take?

2-3 hours for first-time deployment, 1-2 hours if you've done it before.

### Can I stop services to save money?

Yes! Use `./scripts/stop-all.sh` to stop all services when not in use.

### What if something breaks?

Check `AWS_EC2_TROUBLESHOOTING.md` for common issues and solutions.

### Can I scale up later?

Yes! You can upgrade instance types or increase database capacity.

### Do I need AWS experience?

No, the checklist has copy-paste commands for everything.

---

## Ready to Deploy?

### Start Here

👉 **Read**: `DEPLOYMENT_READY.md`

Then follow: `AWS_EC2_DEPLOYMENT_CHECKLIST.md`

---

## Support

### Documentation
- `DEPLOYMENT_READY.md` - Overview
- `AWS_EC2_DEPLOYMENT_CHECKLIST.md` - Step-by-step
- `AWS_EC2_TROUBLESHOOTING.md` - Troubleshooting
- `AWS_EC2_QUICK_REFERENCE.md` - Quick commands

### External Resources
- AWS Documentation: https://docs.aws.amazon.com/
- Temporal Documentation: https://docs.temporal.io/
- Hasura Documentation: https://hasura.io/docs/

---

## Summary

| Aspect | Details |
|--------|---------|
| **What** | Complete OrgEDA platform ready to deploy |
| **Where** | AWS EC2 (4 instances) |
| **Cost** | $28.35/month (8h/day) |
| **Time** | 2-3 hours to deploy |
| **Difficulty** | Easy (step-by-step guide) |
| **Next Step** | Read `DEPLOYMENT_READY.md` |

---

**Status**: ✅ Ready for Deployment

**Start with**: `DEPLOYMENT_READY.md`

Good luck! 🚀

---

**Last Updated**: February 11, 2026

