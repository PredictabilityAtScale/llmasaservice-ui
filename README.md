# Prebuilt UI chat panel for LLM as a Service

LLMAsAService.io is a platform to accelerate and securely develop LLM features in your applications and websites.

This library offers a pre-built panel for incorporating chat GPT style features in react/nextjs applications.

Features
- Multi-turn style chat interface
- Open with an initial prompt (for example, after a click on a Summarize button in your application, set the initialPrompt to "Summarize the following text ..." and the panel will automatically show the summary)
- Light and dark theme
- Abort functionality
- Markdown response display
- Sizable vertically and horizontally to suit your app. use 100vh or 100vw for the height and width to full size the panel in that orientation.


What is LLM as a Service: https://llmasaservice.io

Register for a LLM as a Service account and get your unique project id from the integration page https://app.llmasaservice.io/integration


## Installation

To install the library, use npm or yarn:

```bash
# Using npm
npm install llmasaservice-ui

# Using yarn
yarn add llmasaservice-ui
```

## Usage

In a React application

1. Import the ChatPanel component

```typescript
import React from 'react';
import ChatPanel from 'llmasaservice-ui';
import "../../node_modules/llmasaservice-ui/dist/index.css"; // default styles for light and dark, or replace with your own

const App = () => {
  return (
    <div>
      <h1>My Chat Application</h1>
      <ChatPanel 
        project_id="[[get this from the LLMAsAService control panel]]"
        initialPrompt="Give a nice welcome message"
      />
    </div>
  );
};

export default App;
```
2. Run your application

```bash
npm start
```

In a Next.js application

1. Create a new page in pages/chat.js and add the following code

```javascript
import React from 'react';
import ChatPanel from 'llmasaservice-ui';
import "../../node_modules/llmasaservice-ui/dist/index.css"; // default styles for light and dark, or replace with your own

const ChatPage = () => {
  return (
    <div>
      <h1>Chat Page</h1>
      <ChatPanel 
       project_id="[[your project_id from the llmasaservice control panel]]"
        title="Chat with us"
        initialPrompt="Write a short three sentence background on the city called: Seattle"
        />
    </div>
  );
};

export default ChatPage;
```


2. Run Your Next.js Application:

```bash
npm run dev
```

## Tailwind CSS support

If you use tailwind for CSS styling do these additional steps for proper markdown formatting -

a) install the Typography: 

```bash
npm install -D @tailwindcss/typography 
```

b) add the plugin to your tailwind.config.js file:

```javascript
module.exports = {
  theme: {
    // ...
  },
  plugins: [
    require('@tailwindcss/typography'),
    // ...
  ],
}
```

c) use prose as the class for the markdownStyle. This example is for dark mode

```javascript
 <ChatPanel
        project_id="[[your project_id from the llmasaservice control panel]]"
        title="Chat with us"
        initialPrompt="Write a short three sentence background on the city called: Seattle"
        theme="dark"
        markdownClass="prose prose-sm !max-w-none dark:prose-invert"
      />
```

## Customization
You can customize the chat panel by passing props to the ChatPanel component. Refer to the library documentation for more details on available props and customization options.

See our storybook documentation showing how to theme, size and use the variaous features in this component:

https://predictabilityatscale.github.io/llmasaservice-ui/?path=/docs/chatpanel--docs


## License
This project is licensed under the MIT License.