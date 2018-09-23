import React from 'react'
import PropTypes from 'prop-types'
import { Link as GatsbyLink } from 'gatsby-link'
import styled from 'styled-components';

const AHref = styled.a`
  color: #fff;

  &:visited {
    color: #fff;
  }
`

class Link extends React.Component {
  constructor(props){
    super(props)
  }

  render() {
    const internal = /^\/(?!\/)/.test(this.props.to)

    if (internal) {
      return (
        <GatsbyLink to={this.props.to}>{this.props.children()}</GatsbyLink>
      )
    }

    return (
      <AHref href={this.props.to}>{this.props.children}</AHref>
    )
  }
}

Link.propTypes = {
  to: PropTypes.string
}

export default Link