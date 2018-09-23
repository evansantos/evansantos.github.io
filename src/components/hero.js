import React from 'react'
import styled, { css } from 'styled-components'
import { FaAngleDown, FaInstagram, FaLinkedinIn, FaGithub, FaTwitter } from 'react-icons/fa'

import Link from './link'

const Intro = styled.div`
  -webkit-background-size: cover;
  background-attachment: fixed;
  background-image: url('https://images.unsplash.com/photo-1523800503107-5bc3ba2a6f81?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=b8f20849031243da08385f01188418d2&auto=format&fit=crop&w=2000&q=80');
  background-position: center bottom;
  background-repeat: no-repeat;
  background-size: cover;
  color: #000;
  display: table;
  height: 100%;
  min-height: 720px;
  position: relative;
  text-align: center;
  width: 100%;
`

const IntroOverlay = styled.div`
  background: #000;
  height: 100%;
  left: 0;
  opacity: .75;
  position: absolute;
  top: 0;
  width: 100%;
`

const IntroContent = styled.div`
  display: table-cell;
  text-align: center;
  transform: translateY(-2.1rem);
  vertical-align: middle;
`

const PreTitle = styled.h5`
  color: #cc005f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  font-size: 2.4rem;
  letter-spacing: .3rem;
  line-height: 1.565;
  margin-bottom: 0;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.2);
  text-transform: uppercase
`
const Title = styled.h1`
  color: #FFF;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  font-size: 8.4rem;
  line-height: 1.071;
  max-width: 900px;
  margin: 0 auto .6rem;
  text-shadow: 0 0 20px rgba(0, 0, 0, 0.5)
`

const Positions = styled.p`
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  font-size: 1.6rem;
  letter-spacing: .2rem;
  line-height: 2.4rem;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.2);
  text-transform: uppercase;
`

const Position = styled.span`
  display: inline-block;

  &::after {
    content: '|';
    display: inline-block;
    padding: 0 8px 0 14px;
    text-align: center;
  }

  &:first-child {
    &::before {
      content: '|';
      display: inline-block;
      padding: 0 14px 0 8px;
      text-align: center;
    }
  }
`

const Scrooly = styled.button`
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
  height: 6rem;
  letter-spacing: .25rem;
  line-height: 5.4rem;
  margin-top: .6rem;
  padding: 0 3.5rem 0 3rem;
  text-transform: uppercase;

  &:hover,
  &:focus {
    border-color: #cc005f;
  }
  
`

const Socials = styled.ul`
  bottom: 7.2rem;
  display: block;
  font-size: 3.3rem;
  left: 0;
  margin: 0;
  padding: 0;
  position: absolute;
  width: 100%;
`
const SocialItem = styled.li`
  display: inline-block;
  margin: 0 20px;
  padding: 0;
`

class Hero extends React.Component {
  render() {
    return (
      <Intro>
        <IntroOverlay />
        <IntroContent>
          <PreTitle>Hello, World.</PreTitle>
          <Title>I'm Evandro Santos.</Title>
          <Positions>
            <Position>Front-End Developer</Position>
            <Position>Full-Stack Developer</Position>
          </Positions>
        </IntroContent>
        <Socials>
          <SocialItem>
            <Link to={'https://www.instagram.com/omgitsevan/'}>
              <FaInstagram />
            </Link>
          </SocialItem>
          <SocialItem>
            <Link to={'https://www.linkedin.com/in/evandrocsantos/'}>
              <FaLinkedinIn />
            </Link>
          </SocialItem>
          <SocialItem>
            <Link to={'https://www.github.com/evansantos'}>
              <FaGithub />
            </Link>
          </SocialItem>
          <SocialItem>
            <Link to={'https://www.twitter.com/elfierbr'}>
              <FaTwitter />
            </Link>
          </SocialItem>
        </Socials>
      </Intro>
    );
  }
}

export default Hero;