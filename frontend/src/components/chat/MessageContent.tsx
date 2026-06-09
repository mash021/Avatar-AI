import { RTLWrapper } from "./RTLWrapper";
import { isArabicText } from "@/lib/chat";
import type { ChatLanguage } from "@/types/chat";

type MessageContentProps = {
  content: string;
  chatLanguage: ChatLanguage;
  messageLanguage: string;
};

function stripQuotes(text: string): string {
  return text.trim().replace(/^["']|["']$/g, "");
}

function renderBilingualContent(content: string) {
  const enMatch = content.match(/EN:\s*([\s\S]+?)(?=AR:|$)/i);
  const arMatch = content.match(/AR:\s*([\s\S]+)/i);

  if (!enMatch || !arMatch) {
    return null;
  }

  return (
    <div className="space-y-2">
      <RTLWrapper isRtl={false}>
        <p className="whitespace-pre-wrap text-start">{stripQuotes(enMatch[1])}</p>
      </RTLWrapper>
      <RTLWrapper isRtl className="text-start">
        <p className="whitespace-pre-wrap">{stripQuotes(arMatch[1])}</p>
      </RTLWrapper>
    </div>
  );
}

export function MessageContent({
  content,
  chatLanguage,
  messageLanguage,
}: MessageContentProps) {
  const isRtl =
    chatLanguage === "ar" ||
    messageLanguage === "ar" ||
    isArabicText(content);

  const bilingual = renderBilingualContent(content);
  if (bilingual) {
    return bilingual;
  }

  return (
    <RTLWrapper isRtl={isRtl} className="text-start">
      <p className="whitespace-pre-wrap">{content}</p>
    </RTLWrapper>
  );
}
