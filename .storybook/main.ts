import type { StorybookConfig } from "@storybook/react-webpack5";
import webpack from 'webpack';

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-webpack5-compiler-swc",
    "@storybook/addon-onboarding",
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@chromatic-com/storybook",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  webpackFinal: async (config) => {
    // Provide fallbacks for node built-ins
    config.resolve!.fallback = {
      ...config.resolve!.fallback,
      process: require.resolve("process/browser"),
      child_process: false,
    };

    // Set up aliases
    config.resolve!.alias = {
      ...config.resolve!.alias,
      "node:process": require.resolve("process/browser"),
    };

    // Add ProvidePlugin to inject process globally
    config.plugins = [
      ...(config.plugins || []),
      new webpack.ProvidePlugin({
        process: "process/browser",
      }),
      // Handle node:process scheme
      new webpack.NormalModuleReplacementPlugin(/node:process/, (resource) => {
        resource.request = "process/browser";
      }),
    ];

    return config;
  },
};

export default config;