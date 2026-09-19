"use client";

import { useId, useState } from "react";

export type FaqAccordionItem = {
  question: string;
  answer: string;
};

type Props = {
  items: FaqAccordionItem[];
  /** Open the first item by default when true (default). */
  defaultOpenFirst?: boolean;
};

export function FaqAccordion({
  items,
  defaultOpenFirst = true,
}: Props) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(
    defaultOpenFirst && items.length > 0 ? 0 : null,
  );

  if (items.length === 0) return null;

  return (
    <div className="sf-faq">
      <ul className="sf-faq__list" role="list">
        {items.map((item, index) => {
          const open = openIndex === index;
          const panelId = `${baseId}-panel-${index}`;
          const triggerId = `${baseId}-trigger-${index}`;
          return (
            <li
              key={`${item.question}-${index}`}
              className={`sf-faq__item${open ? " sf-faq__item--open" : ""}`}
            >
              <h3 className="sf-faq__heading">
                <button
                  type="button"
                  id={triggerId}
                  className="sf-faq__trigger"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() =>
                    setOpenIndex((current) =>
                      current === index ? null : index,
                    )
                  }
                >
                  <span className="sf-faq__index" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="sf-faq__question">{item.question}</span>
                  <span className="sf-faq__icon" aria-hidden>
                    <span className="sf-faq__icon-bar sf-faq__icon-bar--h" />
                    <span className="sf-faq__icon-bar sf-faq__icon-bar--v" />
                  </span>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="sf-faq__panel"
                aria-hidden={!open}
              >
                <div className="sf-faq__panel-inner">
                  <p className="sf-faq__answer">{item.answer}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
