# CLAUDE.md - AI Assistant Guidelines

## Project Standards

### Code Style

- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Use functional components with hooks in React
- Implement proper error handling

### Git Workflow

- Feature branches from `develop`
- Conventional commits (feat:, fix:, docs:, etc.)
- PR reviews required before merge
- Squash merge to main

### Testing

- Unit tests for utilities
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 80% code coverage

### Documentation

- JSDoc comments for functions
- README for each module
- API documentation with examples
- Architecture decision records (ADR)

## Project-Specific Rules

1. Always use absolute imports (@/)
2. Keep components under 200 lines
3. Extract business logic to services
4. Use environment variables for config
5. Implement proper logging

## Common Commands

```bash
npm run dev        # Start development
npm run build      # Build for production
npm run test       # Run tests
npm run lint       # Check code style
npm run format     # Format code
```
