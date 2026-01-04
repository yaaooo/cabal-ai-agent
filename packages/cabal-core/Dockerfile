# Use AWS Lambda Python 3.12 base image
FROM public.ecr.aws/lambda/python:3.12

# Install Lambda Web Adapter (LWA), which translates incoming Lambda events 
# into standard HTTP requests that our Uvicorn server can process. 
# The LWA would be a sidecar process next to Uvicorn.
# 
# The main benefit of using LWA is that it allows us to fashion our
# code the same way we write up a regular HTTP server. We avoid
# worrying about Lambda-specific requirements (e.g. `handler()`).
# 
# This means we can more easily support response streaming without
# having to jump through Lambda-specific hoops.
#
# When the Lambda runtime boots up the container with this image,
# it will scan the LWA directory and kickstart the sidecar process.
#
# See https://github.com/awslabs/aws-lambda-web-adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter

# Copy and install cabal-core dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r requirements.txt

# Copy cabal-core source
COPY src/ ${LAMBDA_TASK_ROOT}/

# Override the Lambda base image's entrypoint — it expects a handler 
# reference in the CMD instruction (e.g. ["cabal.handler"]). 
# It expects this handler to take the default Lambda arguments.
#
# Since we're using LWA to operate a regular web server, we don't need to 
# care about the traditional Lambda handler function signature.
ENTRYPOINT []

# Run Uvicorn server
CMD ["python", "-m", "uvicorn", "cabal:app", "--host", "0.0.0.0", "--port", "8080"]