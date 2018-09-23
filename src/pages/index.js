import React from 'react'
import Link from 'gatsby-link'
import Hero from '../components/hero'

// const IndexPage = () => (
  // <div>
  //   <h1>Hi people</h1>
  //   <p>Welcome to your new Gatsby site.</p>
  //   <p>Now go build something great.</p>
  //   <Link to="/page-2/">Go to page 2</Link>
  // </div>
// )

class IndexPage extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return(
      <Hero />
    )
  }
}

export default IndexPage
