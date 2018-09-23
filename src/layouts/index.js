import React from 'react'
import PropTypes from 'prop-types'
import styled, { injectGlobal } from 'styled-components';
import Helmet from 'react-helmet'

// import Header from '../components/header'
// import Hero from '../components/hero'
import PageLoader from '../components/page-loader'

import Styles from './index.css'

// const Layout = ({ children, data }) => (
//   <div>
//     <Helmet
//       title={data.site.siteMetadata.title}
//       meta={[
//         { name: 'description', content: 'Sample' },
//         { name: 'keywords', content: 'sample, something' },
//       ]}
//     />
//     <PageLoader />
//     <Header siteTitle={data.site.siteMetadata.title} />
//     <div
//       style={{
//         margin: '0 auto',
//         maxWidth: 960,
//         padding: '0px 1.0875rem 1.45rem',
//         paddingTop: 0,
//       }}
//     >
//       {children()}
//     </div>
//   </div>
// )

const Wrapper = styled.div`
  height: 100vh;
`;

injectGlobal`
  ${Styles}
  body {
    background-color: black;
    margin: 0;
  }
`

class Layout extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div>
        <Helmet
          title={this.props.data.site.siteMetadata.title}
          meta={[
            { name: 'description', content: 'Evandro Santos website' },
            { name: 'author', content: 'Evandro Santos' },
          ]}
        >
          <html lang="en-US" amp />
        </Helmet>
        <PageLoader />
        <Wrapper>
          {this.props.children()}
        </Wrapper>
      </div>
    )
  }
}

Layout.propTypes = {
  children: PropTypes.func,
  data: PropTypes.object
}

export default Layout

export const query = graphql`
  query SiteTitleQuery {
    site {
      siteMetadata {
        title
      }
    }
  }
`
