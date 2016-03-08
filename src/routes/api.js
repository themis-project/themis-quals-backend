import express from 'express'

import teamRouter from '../routes/team'
import postRouter from '../routes/post'
import contestRouter from '../routes/contest'
import taskRouter from '../routes/task'
import categoryRouter from '../routes/category'
import thirdPartyRouter from '../routes/third-party'
import countryRouter from '../routes/country'
import supervisorRouter from '../routes/supervisor'

import SupervisorController from '../controllers/supervisor'

import TeamController from '../controllers/team'

import { UnknownIdentityError } from '../utils/errors'

import { detectScope } from '../middleware/session'
import { issueToken } from '../middleware/security'
import getLastEventId from '../middleware/last-event-id'

import eventStream from '../controllers/event-stream'
import EventController from '../controllers/event'
import logger from '../utils/logger'
import eventNameList from '../utils/event-name-list'
import _ from 'underscore'

let router = express.Router()

router.use('/team', teamRouter)
router.use('/post', postRouter)
router.use('/contest', contestRouter)
router.use('/task', taskRouter)
router.use('/category', categoryRouter)
router.use('/third-party', thirdPartyRouter)
router.use('/country', countryRouter)
router.use('/supervisor', supervisorRouter)

router.get('/identity', detectScope, issueToken, (request, response, next) => {
  let token = request.session.token

  if (request.scope.isSupervisor()) {
    SupervisorController.get(request.session.identityID, (err, supervisor) => {
      if (err) {
        next(err)
      } else {
        response.json({
          id: request.session.identityID,
          role: supervisor.rights,
          name: supervisor.username,
          token: token
        })
      }
    })
  } else if (request.scope.isTeam()) {
    TeamController.get(request.session.identityID, (err, team) => {
      if (err) {
        next(err)
      } else {
        response.json({
          id: request.session.identityID,
          role: 'team',
          name: team.name,
          emailConfirmed: team.emailConfirmed,
          token: token
        })
      }
    })
  } else if (request.scope.isGuest()) {
    response.json({
      role: 'guest',
      token: token
    })
  } else {
    next(new UnknownIdentityError())
  }
})

function getLatestEvents (lastEventId, callback) {
  if (lastEventId != null) {
    EventController.indexNew(lastEventId, (err, events) => {
      if (err) {
        logger.error(err)
        callback(err, null)
      } else {
        callback(null, events)
      }
    })
  } else {
    callback(null, [])
  }
}

router.get('/stream', detectScope, getLastEventId, (request, response, next) => {
  request.socket.setTimeout(0)

  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })
  response.write('\n')

  getLatestEvents(request.lastEventId, (err, events) => {
    if (err) {
      logger.error(err)
      next(err)
    } else {
      let writeFunc = (data) => {
        response.write(data)
      }

      for (let event of events) {
        if (request.scope.isSupervisor() && event.data.supervisors) {
          writeFunc(eventStream.format(
            event.id,
            eventNameList.getName(event.type),
            5000,
            _.extend(event.data.supervisors, { __metadataCreatedAt: event.createdAt.getTime() })
          ))
        } else if (request.scope.isTeam()) {
          if (event.data.teams) {
            writeFunc(eventStream.format(
              event.id,
              eventNameList.getName(event.type),
              5000,
              _.extend(event.data.teams, { __metadataCreatedAt: event.createdAt.getTime() })
            ))
          } else if (event.data.team && event.data.team.hasOwnProperty(request.session.identityID)) {
            writeFunc(eventStream.format(
              event.id,
              eventNameList.getName(event.type),
              5000,
              _.extend(event.data.team[request.session.identityID], { __metadataCreatedAt: event.createdAt.getTime() })
            ))
          }
        } else if (request.scope.isGuest()) {
          writeFunc(eventStream.format(
            event.id,
            eventNameList.getName(event.type),
            5000,
            _.extend(event.data.guests, { __metadataCreatedAt: event.createdAt.getTime() })
          ))
        }
      }

      let mainChannel = `message:${request.scope.toString()}`
      let extraChannel = null
      if (request.scope.isTeam()) {
        extraChannel = `message:team-${request.session.identityID}`
      }

      eventStream.on(mainChannel, writeFunc)
      if (extraChannel) {
        eventStream.on(extraChannel, writeFunc)
      }

      request.once('close', () => {
        eventStream.removeListener(mainChannel, writeFunc)
        if (extraChannel) {
          eventStream.removeListener(extraChannel, writeFunc)
        }
      })
    }
  })
})

export default router
