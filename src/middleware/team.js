import TeamController from '../controllers/team'

export function getTeam (request, response, next) {
  TeamController.get(request.session.identityID, (err, team) => {
    if (err) {
      next(err)
    } else {
      request.team = team
      next()
    }
  })
}
