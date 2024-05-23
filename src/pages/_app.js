import "../styles/globals.css"; // Import other global styles if any

import Layout from "@/components/layout";

export default function App({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
