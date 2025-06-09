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
  const [activeLeft, setActiveLeft] = useState(null)

  const handleAnswer = (qIdx, optionIdx, checked) => {
    if (!quiz || quiz[qIdx].type === 'match') return
    const updated = [...answers]
    const isMulti = Array.isArray(quiz[qIdx].answer) && quiz[qIdx].answer.length > 1
    if (isMulti) {
      const current = new Set(updated[qIdx] || [])
      if (checked) {
        current.add(optionIdx)
      } else {
        current.delete(optionIdx)
      }
      updated[qIdx] = Array.from(current)
    } else {
      updated[qIdx] = optionIdx
    }
    setAnswers(updated)
  }

  const handlePairLeft = (qIdx, li) => {
    if (submitted) return
    setActiveLeft({ qIdx, li })
  }

  const handlePairRight = (qIdx, ri) => {
    if (submitted || !activeLeft || activeLeft.qIdx !== qIdx) return
    const updated = [...answers]
    const mapping = { ...(updated[qIdx] || {}) }
    mapping[activeLeft.li] = ri
    updated[qIdx] = mapping
    setAnswers(updated)
    setActiveLeft(null)
  }

  const handleDone = () => {
    setSubmitted(true)
  }

  const handleReset = () => {
    if (quiz) {
      setAnswers(
        quiz.map((q) => {
          if (q.type === 'match') return {}
          return Array.isArray(q.answer) && q.answer.length > 1 ? [] : null
        })
      )
    }
    setSubmitted(false)
    setActiveLeft(null)
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
          const processed = attributes.questions.map((q) => {
            if (q.type === 'match' && Array.isArray(q.pairs)) {
              let pairs = [...q.pairs]
              if (pairs.length > 5) {
                pairs = pairs.sort(() => Math.random() - 0.5).slice(0, 5)
              }
              const left = pairs.map(p => Array.isArray(p) ? p[0] : p.left)
              const right = pairs.map(p => Array.isArray(p) ? p[1] : p.right)
              const leftShuffled = [...left].sort(() => Math.random() - 0.5)
              const rightShuffled = [...right].sort(() => Math.random() - 0.5)
              const ansMap = {}
              leftShuffled.forEach((lw, li) => {
                const origIdx = left.indexOf(lw)
                const rw = right[origIdx]
                ansMap[li] = rightShuffled.indexOf(rw)
              })
              return { type: 'match', prompt: q.prompt, left: leftShuffled, right: rightShuffled, answer: ansMap }
            }
            let ans = q.answer
            if (typeof ans === 'string') {
              ans = ans.split(',').map((a) => parseInt(a.trim(), 10)).filter((n) => !isNaN(n))
            } else if (!Array.isArray(ans)) {
              ans = [ans]
            }
            return { ...q, type: 'multiple', answer: ans }
          })
          // randomize questions and limit to 5
          const shuffled = processed.sort(() => Math.random() - 0.5).slice(0, 5)
          setQuiz(shuffled)
          setAnswers(shuffled.map((q) => {
            if (q.type === 'match') return {}
            return q.answer.length > 1 ? [] : null
          }))
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
          {quiz.map((q, qi) => {
            const isMatch = q.type === 'match'
            const isCorrect = submitted && (isMatch
              ? Object.keys(q.answer).every((k) => (answers[qi] || {})[k] === q.answer[k]) &&
                Object.keys(answers[qi] || {}).length === Object.keys(q.answer).length
              : (q.answer.length > 1
                  ? q.answer.every((a) => (answers[qi] || []).includes(a)) &&
                    (answers[qi] || []).length === q.answer.length
                  : answers[qi] === q.answer[0]))
            return (
              <div key={qi} className="mb-6">
                <p className="font-semibold mb-2">{q.prompt}</p>
                {isMatch ? (
                  <div className="flex gap-4">
                    <div className="flex flex-col gap-2">
                      {q.left.map((word, li) => (
                        <button
                          key={li}
                          onClick={() => handlePairLeft(qi, li)}
                          disabled={submitted}
                          className={`px-2 py-1 border rounded ${
                            activeLeft && activeLeft.qIdx === qi && activeLeft.li === li
                              ? 'bg-blue-200'
                              : answers[qi] && answers[qi][li] !== undefined
                                ? 'bg-green-100'
                                : ''
                          }`}
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      {q.right.map((word, ri) => (
                        <button
                          key={ri}
                          onClick={() => handlePairRight(qi, ri)}
                          disabled={submitted}
                          className={`px-2 py-1 border rounded ${
                            Object.entries(answers[qi] || {}).some(([l, r]) => r === ri)
                              ? 'bg-gray-200'
                              : ''
                          }`}
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  q.options.map((opt, oi) => (
                    <label key={oi} className="block mb-1">
                      <input
                        type={q.answer.length > 1 ? 'checkbox' : 'radio'}
                        name={`q-${qi}`}
                        className="mr-2"
                        onChange={(e) => handleAnswer(qi, oi, e.target.checked)}
                        checked={
                          q.answer.length > 1
                            ? (answers[qi] || []).includes(oi)
                            : answers[qi] === oi
                        }
                        disabled={submitted}
                      />
                      {opt}
                    </label>
                  ))
                )}
                {submitted && (
                  <p className={`mt-1 font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {isCorrect
                      ? 'Correct!'
                      : isMatch
                        ? 'Incorrect.'
                        : `Incorrect. Correct answer: ${q.answer
                            .map((a) => q.options[a])
                            .join(', ')}`}
                  </p>
                )}
              </div>
            )
          })}

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
