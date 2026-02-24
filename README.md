# EcommerceApp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.15.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Deploy to GitHub Pages

This repository is configured for GitHub Pages deployment.

### One-time setup

Install dependencies (includes the deploy tool):

```bash
npm install
```

### Deploy

Build and publish to the `gh-pages` branch:

```bash
npm run deploy
```

The deploy command runs a production build with this base href:

`/ecommerce_app/`

It also publishes explicitly to:

- repo: `https://github.com/SUDHAKARMEENKERI/ecommerce_app.git`
- branch: `gh-pages`

### GitHub Pages settings

In your GitHub repository:

1. Open **Settings → Pages**
2. Under **Build and deployment**, choose **Deploy from a branch**
3. Select branch **gh-pages** and folder **/(root)**
4. Save

Your app URL will be:

`https://sudhakarmeenkeri.github.io/ecommerce_app/`
