import fs from 'fs'
import path from 'path'
import fm from 'front-matter'
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import remarkFixLinks from './src/utils/remarkFixLinks.js'

export default function generatePostsPlugin() {
  return {
    name: 'generate-posts-index',
    async buildStart() {

      const BASE_URL = '/'

      const POSTS_DIR = './public/posts'
      const OUTPUT_JSON = './public/posts/posts.json'
      const OUTPUT_QUIZES = './public/posts/quizes.json'
      const OUTPUT_RSS = './public/rss.xml'
      const SITE_URL = 'https://latin.eugeniopace.org'


      console.log(`🔍 BASE_URL set to: ${BASE_URL}`);

      if (!fs.existsSync(POSTS_DIR)) {
        console.warn(`⚠ No posts directory found at ${POSTS_DIR}`)
        return
      }

      const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') || f.endsWith('.markdown'))
      const postFiles = files.filter(f => !f.startsWith('quiz-'))
      const quizFiles = files.filter(f => f.startsWith('quiz-'))

      async function getExcerptHtml(body) {
        const firstPara = body.trim().split(/\n{2,}/)[0]
        const processed = await remark()
          .use(remarkFixLinks, { base: BASE_URL })
          .use(remarkRehype)
          .use(rehypeStringify)
          .process(firstPara)
        return {
          html: processed.toString(),
          plain: firstPara.trim()
        }
      }

      const posts = await Promise.all(
        postFiles.map(async (filename) => {
          const fullPath = path.join(POSTS_DIR, filename)
          const raw = fs.readFileSync(fullPath, 'utf-8')
          const { attributes, body } = fm(raw)
          const excerpts = await getExcerptHtml(body)

            const extension = path.extname(filename);
            return {
              slug: filename.replace(/\.(md|markdown)$/, ''),
              title: attributes.title,
              date: new Date(attributes.date),
              author: attributes.author,
              categories: Array.isArray(attributes.categories)
                ? attributes.categories
                : String(attributes.categories || '')
                  .split(/[,\s]+/)
                  .filter(Boolean),
              visible: attributes.visible !== false,
              excerpt: excerpts.html,
              excerptPlain: excerpts.plain,
              extension,
            }
        })
      )

      fs.writeFileSync(OUTPUT_JSON, JSON.stringify(posts, null, 2))
      console.log(`✔ Generated ${posts.length} posts → ${OUTPUT_JSON}`)

      // Build quiz mapping
      const quizMap = {}
      for (const postFile of postFiles) {
        const slug = postFile.replace(/\.(md|markdown)$/, '')
        const related = quizFiles.filter(q => q.includes(`-${slug}.`))
        if (related.length) {
          quizMap[postFile] = related
        }
      }
      fs.writeFileSync(OUTPUT_QUIZES, JSON.stringify(quizMap, null, 2))
      console.log(`✔ Generated quiz map with ${Object.keys(quizMap).length} entries → ${OUTPUT_QUIZES}`)

      // ✅ Optional RSS generation
      const rssItems = posts.map(post => `
  <item>
    <title><![CDATA[${post.title}]]></title>
    <link>${SITE_URL}/post/${post.slug}</link>
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <author>${post.author}</author>
    <description><![CDATA[${post.excerpt}]]></description>
    <guid isPermaLink="true">${SITE_URL}/post/${post.slug}</guid>
  </item>`).join('\n')

      const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>ITINERARIVM LATINVM</title>
  <link>${SITE_URL}</link>
  <description>Itinerarium Latinum</description>
  <language>en-us</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${rssItems}
</channel>
</rss>`

      fs.writeFileSync(OUTPUT_RSS, rss.trim())
      console.log(`📰 RSS feed generated → ${OUTPUT_RSS}`)
    }
  }
}
