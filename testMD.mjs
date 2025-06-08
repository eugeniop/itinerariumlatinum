import { remark } from 'remark'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import matter from 'gray-matter'

const raw = `
---
title: Hello
---

# Heading

Some **bold** text and a [link](https://example.com).
`

const { content } = matter(raw)

const processed = await remark()
  .use(remarkRehype)
  .use(rehypeStringify)
  .process(content)

console.log(processed.toString())
