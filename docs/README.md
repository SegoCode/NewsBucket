## Initialization

**Note**: This step is only forn setting up a new repository.

Before starting to work with the repository, an initialization step is required to replace placeholders with actual repository information.

### Running the Initializer Workflow

We have an initializer GitHub Action that replaces placeholders in the repository files with the actual repository name and username.

To initialize the repository:

1. **Trigger the Initializer Workflow**:

   - Go to the **Actions** tab in the GitHub repository.
   - Select the **Initialize repository** workflow.
   - Click on **Run workflow** to manually trigger it.

2. **Workflow Actions**:

   - The workflow replaces all instances of `reponame` and `username` with `{}` in all files with the actual repository name and username.
   - It removes the initializer workflow file (`initializer.yml`).
   - It commits these changes to a new branch and opens a PR to `main`.

3. **Merge the Initialization PR**:

   - Review the PR created by the initializer workflow.
   - Once satisfied, merge the PR into `main`.

## Branching Strategy

We use a branching model inspired by Gitflow to manage our development process:

- **`main`**: The production-ready branch containing the latest stable code.
- **`develop`**: The development branch where new features and bug fixes are integrated before being promoted to `main`.

```
       --------------------> [main]
      /
[develop]
```

## Development Workflow

### 1. Fork and Clone the Repository

Fork the repository to your own GitHub account and clone it to your local machine:

```
git clone https://github.com/{username}/{reponame}.git
```

### 2. Create a Feature Branch

Create a new branch off `develop` for your feature or bug fix:

```
git checkout -b feature/your-feature-name develop
```

### 3. Make Changes and Commit

Implement your changes, ensuring you follow the project's coding standards. Commit your changes with clear and descriptive messages:

```
git add .
git commit -m "feat: add new authentication module"
```

### 4. Push to Your Fork

Push your feature branch to your forked repository:

```
git push origin feature/your-feature-name
```

### 5. Open a Pull Request to `develop`

Navigate to your fork on GitHub and open a Pull Request (PR) to merge your feature branch into the `develop` branch of the main repository.

```
Your Fork [feature/your-feature-name]
           |
           v
Main Repo [develop]
```

### 6. Code Review and Approval

Your PR will undergo code review. Make any requested changes until it is approved by a maintainer.

### 7. Merge into `develop`

Once approved, your PR will be merged into the `develop` branch.

```
[feature/your-feature-name] --> [develop]
```

## Synchronization Between Branches

### Sync from `develop` to `main`

#### Manual Trigger of Sync Workflow

When changes in `develop` are ready to be promoted to `main`, manually trigger the **Sync from develop to main** workflow:

1. Go to the **Actions** tab in the GitHub repository.
2. Select the **Sync from develop to main** workflow.
3. Click on **Run workflow** to manually trigger it.

#### Automatic PR Creation

- The workflow creates a PR to merge `develop` into `main`.
- The PR includes labels `auto-sync` and `auto-tag`.

```
[develop] --(Workflow)--> PR to [main]
```

#### Review and Merge

- **Review**: The PR should be reviewed to ensure all changes are ready for production.
- **Merge**: After approval, merge the PR into `main`.

### Sync from `main` to `develop`

After changes are merged into `main`, the **Sync from main to develop** workflow automatically merges `main` back into `develop` to keep it up to date with any hotfixes or urgent changes.

```
[main] --(Auto Merge)--> [develop]
```

## Tagging and Releases

### Automatic Tag Creation

When a PR is merged into `main` and has the `auto-tag` label, the **Generate tag** workflow is triggered:

1. **Tag Creation**:

   - The workflow determines the new version number by incrementing the minor version of the latest tag.
   - If no tags exist, it starts with `1.0`.
   - It creates a new tag on the `main` branch.

2. **Issue Creation**:

   - The workflow creates an issue in the repository to notify maintainers that a new tag has been created.
   - The issue includes a link to create a release for the new tag.

```
[main] --(Merge PR with 'auto-tag' label)--> [Create Tag vX.Y] --> [Create Issue]
```

#### Tag Versioning

- We use a simplified versioning scheme: `major.minor`.
- The major version remains constant unless manually changed.
- The minor version increments with each tagged release.

### Creating a Release

Maintainers should:

1. Review the issue created by the **Generate tag** workflow.
2. Decide whether to create a formal release from the new tag.
3. If a release is needed, use the provided link to create it.
4. Close the issue once the release decision is made.

## Commit Messages and Labels

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:

- **Format**: `type(scope): description`
- **Types**:
  - `feat`: A new feature
  - `fix`: A bug fix
  - `docs`: Documentation changes
  - `style`: Code style changes (formatting, missing semicolons, etc.)
  - `refactor`: Code changes that neither fix a bug nor add a feature
  - `test`: Adding or updating tests

### Pull Request Labels

- **`auto-sync`**: Indicates the PR is syncing `develop` to `main`.
- **`auto-tag`**: Triggers automatic tag creation upon merging.
