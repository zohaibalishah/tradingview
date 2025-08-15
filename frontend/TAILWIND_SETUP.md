# Tailwind CSS Setup

This project has been configured with Tailwind CSS v3 for modern, utility-first styling.

## Configuration Files

### 1. `tailwind.config.js`
- **Content paths**: Configured to scan all React components in the `src` directory
- **Custom colors**: Added primary and secondary color palettes
- **Custom fonts**: Inter font family configured
- **Custom shadows**: Soft shadow utility added

### 2. `postcss.config.js`
- Configured to work with Tailwind CSS v3 and Autoprefixer

### 3. `src/index.css`
- Tailwind directives included (`@tailwind base`, `@tailwind components`, `@tailwind utilities`)
- Google Fonts import for Inter font
- Custom component styles using `@layer components`
- Existing button styles converted to Tailwind utilities

## Features

### Custom Color Palette
- **Primary**: Blue color scheme (50-900)
- **Secondary**: Gray color scheme (50-900)

### Custom Utilities
- **Soft shadow**: `shadow-soft` class for subtle shadows
- **Custom buttons**: Buy/sell buttons with Tailwind classes
- **Responsive design**: Mobile-first approach

### Authentication Pages
- **Login Page**: Modern design with gradient background, card layout, and form validation
- **Signup Page**: Enhanced with password strength indicator and responsive grid layout

## Usage

### Basic Classes
```jsx
// Container with gradient background
<div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">

// Card with soft shadow
<div className="bg-white shadow-soft rounded-xl border border-gray-100">

// Form inputs
<input className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />

// Buttons
<button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
```

### Responsive Design
```jsx
// Mobile-first responsive grid
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

// Responsive padding
<div className="px-4 sm:px-6 lg:px-8">
```

## Development

To start the development server:
```bash
npm run dev
```

The Tailwind CSS classes will be automatically processed and optimized for production builds.

## Customization

To add new custom utilities or modify the theme:

1. Edit `tailwind.config.js` for theme extensions
2. Add custom components in `src/index.css` using `@layer components`
3. Use `@apply` directive to compose existing utilities

## Dependencies

- `tailwindcss@^3.4.0`: Core framework (v3 for stability)
- `postcss`: CSS processing
- `autoprefixer`: Vendor prefixing
- `react-icons`: Icon library for enhanced UI

## Troubleshooting

If you encounter PostCSS errors:
1. Ensure you're using Tailwind CSS v3 (not v4)
2. Check that `postcss.config.js` uses the correct plugin syntax
3. Verify all dependencies are properly installed
