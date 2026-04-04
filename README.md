# oxlint-plugin-utilities

## CI/CD & Branch Protection

### Branch Protection Rules

Configure these rules for `main` branch in GitHub Settings → Branches:

1. **Require status checks to pass before merging**
   - Required check: `validate` (from CI workflow)

2. **Require branches to be up to date before merging**
   - Ensures PR tests run on latest main

3. **Require linear history** (optional)
   - Prevents merge commits, keeps history clean

4. **Require signed commits** (optional)
   - Enhances security with commit signatures

5. **Do not allow bypassing the above settings**
   - Enforces rules for everyone (including admins)

### Release Process

1. **Version bump**: Run `bun run release` locally (bumpp)
   - Interactive version selection
   - Auto-commits, tags, and pushes

2. **Automated publishing**:
   - Tag push triggers `release.yaml` workflow
   - Validates tag matches package.json version
   - Runs tests
   - Publishes to NPM with provenance
   - Creates GitHub release with changelog

3. **NPM Trusted Publishing**:
   - No NPM_TOKEN secret needed
   - Uses GitHub OIDC for authentication
   - Configure at npmjs.com → Package Settings → Trusted Publishers
   - Add trusted publisher:
     - Repository: `howmanysmall/oxlint-plugin-utilities`
     - Workflow: `release.yaml`
     - Environment: (leave empty)
