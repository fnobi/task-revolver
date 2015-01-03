var TaskRevolver = function (opts) {
    opts = opts || {};

    this.tasks = opts.tasks || {};
    this.ticker = opts.ticker || new Ticker({
        clock: 20,
        auto: true
    });

    this.agent = {};
    this.currentTasks = [];

    if (opts.defaultAgent) {
        this.setAgent(opts.defaultAgent);
    }
};
TaskRevolver = EventTrigger.extend(TaskRevolver);

TaskRevolver.DEFAULT_AGENT_NAME = '_default';
TaskRevolver.DEFAULT_INIT_TASK = 'init';

TaskRevolver.prototype.setAgent = function (name, agent) {
    var undef;
    if (agent === undef) {
        agent = name;
        name = TaskRevolver.DEFAULT_AGENT_NAME;
    }
    this.agent[name] = agent;
};

TaskRevolver.prototype.addTask = function (name) {
    var instance = this;

    var task = this.tasks[name];
    if (!task) {
        return;
    }

    var agentName = task.agent || TaskRevolver.DEFAULT_AGENT_NAME;
    var agent = this.agent[agentName] || {};
    var fn = agent[task.method] || function () {};
    var duration = isNaN(task.duration) ? 0 : task.duration;
    var easing = task.easing || function (t) { return t; };
    var keep = !!task.keep;
    var next = task.next;

    var time = 0;
    var completed = false;
    var loop = function (delta) {
        if (completed) {
            fn.apply(agent, [1]);
            return;
        }
        time += delta;
        if (time < duration) {
            fn.apply(agent, [easing(time / duration)]);
        } else {
            fn.apply(agent, [1]);
            completed = true;
            if (!keep) {
                instance.removeTask(loop);
            }
            if (next) {
                instance.addTask(next);
            }
            instance.trigger('taskEnd:' + name);
        }
    };
    this.currentTasks.push(loop);
};

TaskRevolver.prototype.removeTask = function (loop) {
    var array = [];
    $.each(this.currentTasks, function (index, l) {
        if (l !== loop) {
            array.push(l);
        }
    });
    this.currentTasks = array;
};

TaskRevolver.prototype.draw = function (delta) {
    var instance = this;
    $.each(this.currentTasks, function (index, task) {
        task(delta);
    });
};

TaskRevolver.prototype.start = function (initTask) {
    initTask = initTask || TaskRevolver.DEFAULT_INIT_TASK;

    if (this.loop) {
        this.stop();
    }

    this.currentTasks = [];
    this.addTask(initTask);

    var instance = this;
    this.loop = function (e) {
        instance.draw(e.delta);
    };
    this.ticker.on('tick', this.loop);
};

TaskRevolver.prototype.stop = function () {
    if (!this.loop) {
        return;
    }

    this.ticker.off('tick', this.loop);
    this.loop = null;
};
