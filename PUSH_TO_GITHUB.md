# Push OrgEDA to GitHub

Follow these steps to push your code to GitHub.

---

## Step 1: Initialize Git (if not already done)

From your project root directory:

```bash
cd org-eda-platform
git init
```

---

## Step 2: Add Remote Repository

Replace `YOUR_USERNAME` with your GitHub username:

```bash
git remote add origin https://github.com/YOUR_USERNAME/org-eda-platform.git
```

Verify it's added:
```bash
git remote -v
```

---

## Step 3: Add All Files

```bash
git add .
```

This will add all files except those in `.gitignore`:
- ✅ Source code
- ✅ Configuration files
- ✅ `.env.example` files
- ❌ `.env` files (sensitive data)
- ❌ `node_modules/` (dependencies)
- ❌ `dist/` (build outputs)
- ❌ `org-eda-key.pem` (SSH key)

---

## Step 4: Commit

```bash
git commit -m "Initial commit: OrgEDA platform with AWS EC2 deployment"
```

---

## Step 5: Push to GitHub

```bash
git branch -M main
git push -u origin main
```

---

## Step 6: Verify

Go to your GitHub repository and verify all files are there:
- ✅ `backend/` folder
- ✅ `frontend/` folder
- ✅ `docker/` folder
- ✅ `hasura/` folder
- ✅ `scripts/` folder
- ✅ `.gitignore` file
- ✅ `README.md` file
- ✅ `.env.example` files

---

## What's NOT Pushed (Good!)

These files are ignored for security:
- `.env` files (contain secrets)
- `node_modules/` (too large)
- `dist/` (build outputs)
- `org-eda-key.pem` (SSH key)
- `storage/` (local files)

---

## Update DEPLOY_NOW.md

Once your repo is on GitHub, update the clone URL in `DEPLOY_NOW.md`:

Replace all instances of:
```bash
git clone https://github.com/your-repo/org-eda-platform.git
```

With your actual repo URL:
```bash
git clone https://github.com/YOUR_USERNAME/org-eda-platform.git
```

---

## Quick Commands Summary

```bash
# Navigate to project
cd org-eda-platform

# Initialize git
git init

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/org-eda-platform.git

# Add all files
git add .

# Commit
git commit -m "Initial commit: OrgEDA platform"

# Push
git branch -M main
git push -u origin main
```

---

## Troubleshooting

### "fatal: not a git repository"
```bash
git init
```

### "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/org-eda-platform.git
```

### "Permission denied (publickey)"
You need to set up SSH keys for GitHub. See: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### "fatal: 'origin' does not appear to be a 'git' repository"
Make sure you're in the correct directory:
```bash
pwd  # Should show: .../org-eda-platform
```

---

## Next Steps

After pushing to GitHub:

1. Update the repo URL in `DEPLOY_NOW.md`
2. Deploy Instance 1 (Frontend + Backend)
3. Deploy Instance 2 (Hasura)
4. Deploy Instance 3 (Temporal Server)
5. Deploy Instance 4 (Temporal Worker)
6. Run database migrations

---

**Ready to push?** Run the commands above! 🚀

