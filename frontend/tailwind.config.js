/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  safelist: [
    {
      // Match almost all Tailwind utility prefixes
      pattern:
        /^(bg|text|hover:bg|hover:text|focus:bg|focus:text|active:bg|active:text|rounded|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|font|shadow|ring|border|flex|grid|gap|items|justify|content|self|place|w|h|min-w|min-h|max-w|max-h|overflow|opacity|z|order|animate|transition|duration|ease|scale|rotate|translate|skew|rounded-t|rounded-r|rounded-b|rounded-l|rounded-tr|rounded-tl|rounded-br|rounded-bl|outline|cursor|select|align|list|columns|break|whitespace|line|place|object|fill|stroke|stroke-width|table|col|row|hidden|visible|sr-only|not-sr-only|pointer-events|mix-blend|bg-gradient-to|from|via|to|backdrop|blur|contrast|brightness|saturate|grayscale|invert|sepia|hue-rotate)-/,
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
