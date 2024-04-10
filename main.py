from flask import Flask, render_template, request
from flask_login import LoginManager
import yaml
from utils import AttrDict

from flask import Flask
from flask_mail import Mail, Message

with open('config.yml', 'r') as config_file:
    config = yaml.load(config_file, Loader=yaml.Loader)
    config = AttrDict(config)

def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = config.db.secret_key
    app.config['SQLALCHEMY_DATABASE_URI'] = config.db.uri

    app.config['MAIL_SERVER'] = config.email.server
    app.config['MAIL_PORT'] = config.email.port
    app.config['MAIL_USERNAME'] = config.email.address
    app.config['MAIL_PASSWORD'] = config.email.password
    app.config['MAIL_USE_TLS'] = config.email.tls
    app.config['MAIL_USE_SSL'] = config.email.ssl

    from driver import app as blueprint
    app.register_blueprint(blueprint)

    mail = Mail(app)

    return app, mail

app, mail = create_app()

@app.route('/mail', methods=["POST"])
def send_mail():
    sender = request.environ.get('HTTP_ORIGIN', 'default value')
    if sender not in config.domains.allow:
        return ""

    msg = Message(
              config.email.feedback_subject,
              sender=config.email.address,
              recipients=[config.email.recipient]
        )
    msg.body = f"""This is an automated message from the feedback page at writingwellishard.com. 

    Sender name: {request.form['name']}
    Sender email: {request.form['email']}
    Sender consents to join mailing list? {'consent' in request.form and request.form['consent']=='on'}
    Sender comments: {request.form['message']}"""
    mail.send(msg)
    return render_template('thanks.html')
