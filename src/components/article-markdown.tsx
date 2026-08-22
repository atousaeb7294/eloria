import type { ReactNode } from "react";

type ArticleMarkdownProps = {
  value: string;
};

type Block =
  | {
      type: "heading";
      level: 2 | 3;
      value: string;
    }
  | {
      type: "list";
      values: string[];
    }
  | {
      type: "paragraph";
      value: string;
    };

function parseBlocks(value: string): Block[] {
  const lines = value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .slice(0, 4_000);
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({
        type: "paragraph",
        value: paragraph.join(" "),
      });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list.length > 0) {
      blocks.push({
        type: "list",
        values: list,
      });
      list = [];
    }
  };

  for (const line of lines) {
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/u);

    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length >= 3 ? 3 : 2,
        value: heading[2],
      });
      continue;
    }

    const listItem = line.match(/^(?:[-*•])\s+(.+)$/u);

    if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function ArticleMarkdown({ value }: ArticleMarkdownProps) {
  const blocks = parseBlocks(value);

  const content: ReactNode[] = blocks.map((block, index) => {
    if (block.type === "heading") {
      const Heading = block.level === 2 ? "h2" : "h3";

      return (
        <Heading
          key={`${block.type}-${index}`}
          className={
            block.level === 2
              ? "mt-11 scroll-mt-32 text-2xl font-semibold leading-relaxed text-[#f4e2b9] sm:text-3xl"
              : "mt-8 scroll-mt-32 text-xl font-medium leading-relaxed text-[#eedbad] sm:text-2xl"
          }
        >
          {block.value}
        </Heading>
      );
    }

    if (block.type === "list") {
      return (
        <ul
          key={`${block.type}-${index}`}
          className="mt-5 space-y-3 border-s border-[#d8b85f]/22 ps-5 text-[15px] leading-8 text-[#d8c9aa]/78 sm:text-base sm:leading-9"
        >
          {block.values.map((item, itemIndex) => (
            <li
              key={`${item}-${itemIndex}`}
              className="relative ps-3 before:absolute before:start-0 before:top-[0.88rem] before:size-1.5 before:rounded-full before:bg-[#dfc16f] before:shadow-[0_0_10px_rgba(223,193,111,0.7)]"
            >
              {item}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p
        key={`${block.type}-${index}`}
        className="mt-5 text-[15px] leading-8 text-[#d8c9aa]/78 sm:text-base sm:leading-9"
      >
        {block.value}
      </p>
    );
  });

  return <div className="mx-auto max-w-3xl">{content}</div>;
}
