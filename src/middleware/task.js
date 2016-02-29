import TaskController from '../controllers/task'

export function getTask (request, response, next) {
  TaskController.get(request.taskId, (err, task) => {
    if (err) {
      next(err)
    } else {
      request.task = task
      next()
    }
  })
}
