export const dynamic = "force-dynamic";

import NewsPostClient from "./NewsPostClient";

export default function NewsPostPage({ params }: { params: { id: string } }) {
  return <NewsPostClient params={params} />;
}
