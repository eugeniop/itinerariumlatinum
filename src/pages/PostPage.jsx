import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import fm from 'front-matter'
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'
import rehypeMermaid from 'rehype-mermaid';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm';
import { formatDateWithOrdinal } from '../utils/formatDate'
import remarkFixLinks from '../utils/remarkFixLinks.js'

const posts = import.meta.glob('../posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function estimateReadTime(text) {
  const words = text.trim().split(/\s+/).length
  if (words < 360) return 'about 1 min'
  const minutes = Math.ceil(words / 180)
  return `About ${minutes} min${minutes > 1 ? 's' : ''}`
}

function PostPage() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [tab, setTab] = useState('content')

  const handleAnswer = (qIdx, optionIdx) => {
    const updated = [...answers]
    updated[qIdx] = optionIdx
    setAnswers(updated)
  }

  const handleDone = () => {
    setSubmitted(true)
  }

  const handleReset = () => {
    if (quiz) setAnswers(Array(quiz.length).fill(null))
    setSubmitted(false)
  }

  useEffect(() => {
    const loadPost = async () => {

      const res = await fetch(`${import.meta.env.BASE_URL}posts/${slug}`)
      const raw = await res.text()

      const { attributes: data, body: content } = fm(raw)

      const processed = await remark()
        .use(remarkFixLinks, { base: import.meta.env.BASE_URL || '/' })
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(remarkGfm)
        .use(rehypeHighlight)
        .use(rehypeMermaid)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(content);

      const contentHtml = processed.toString()

      setPost({
        title: data.title,
        date: data.date,
        author: data.author,
        content: contentHtml,
        readTime: estimateReadTime(content),
        categories: Array.isArray(data.categories)
                      ? data.categories
                      : (data.categories || '').split(' ').filter(Boolean),
      })
    }

    const loadQuiz = async () => {
      const baseSlug = slug.replace(/\.(md|markdown)$/, '')
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}posts/quiz-${baseSlug}.md`)
        if (!res.ok) {
          setQuiz(null)
          return
        }
        const raw = await res.text()
        const { attributes } = fm(raw)
        if (attributes.questions) {
          setQuiz(attributes.questions)
          setAnswers(Array(attributes.questions.length).fill(null))
        }
      } catch (err) {
        console.error('Failed to load quiz', err)
      }
    }

    loadPost()
    loadQuiz()
    setTab('content')
    setSubmitted(false)
  }, [slug])

  if (!post) return <p className="p-4">Loading post...</p>

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
      <p className="text-gray-500 text-sm mb-2">
        Written by {post.author} on {formatDateWithOrdinal(post.date)} · {post.readTime} read
      </p>
      {post.categories && (
        <div className="mb-4 flex flex-wrap gap-2">
          {post.categories.map((tag) => (
            <span
              key={tag}
              className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      <p className="mt-4">
        <a href={import.meta.env.BASE_URL} className="text-blue-600 underline">← Home</a>
      </p>

      {/* Tabs */}
      <div className="mb-4 mt-4">
        <button
          onClick={() => setTab('content')}
          className={`px-3 py-1 mr-2 rounded ${
            tab === 'content' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          Content
        </button>
        {quiz && (
          <button
            onClick={() => setTab('quiz')}
            className={`px-3 py-1 rounded ${
              tab === 'quiz' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Quiz
          </button>
        )}
      </div>

      {tab === 'content' && (
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      )}

      {tab === 'quiz' && quiz && (
        <div>
          {quiz.map((q, qi) => (
            <div key={qi} className="mb-6">
              <p className="font-semibold mb-2">{q.prompt}</p>
              {q.options.map((opt, oi) => (
                <label key={oi} className="block mb-1">
                  <input
                    type="radio"
                    name={`q-${qi}`}
                    className="mr-2"
                    onChange={() => handleAnswer(qi, oi)}
                    checked={answers[qi] === oi}
                    disabled={submitted}
                  />
                  {opt}
                </label>
              ))}
              {submitted && (
                <p
                  className={`mt-1 font-semibold ${
                    answers[qi] === q.answer ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {answers[qi] === q.answer
                    ? 'Correct!'
                    : `Incorrect. Correct answer: ${q.options[q.answer]}`}
                </p>
              )}
            </div>
          ))}

          {quiz.length > 0 && (
            <div className="mt-4">
              <button
                onClick={handleDone}
                className="bg-green-600 text-white px-4 py-2 rounded mr-2"
              >
                Done
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PostPage
