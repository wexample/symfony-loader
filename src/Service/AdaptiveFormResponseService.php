<?php

namespace Wexample\SymfonyLoader\Service;

use RuntimeException;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;
use Wexample\SymfonyLoader\Rendering\RenderPass;

class AdaptiveFormResponseService
{
    private ?string $view = null;
    private array $parameters = [];
    private ?Response $redirect = null;
    private ?bool $formHasErrors = null;

    public function __construct(
        private readonly AdaptiveRendererService $adaptiveRendererService,
        private readonly AdaptiveResponseService $adaptiveResponseService,
    ) {
    }

    public function setView(string $view, array $parameters = []): self
    {
        $this->view = $view;

        if ($parameters) {
            $this->parameters = $parameters;
        }

        return $this;
    }

    public function setViewDefault(string $view, array $parameters = []): self
    {
        if (!$this->hasAction()) {
            $this->setView($view, $parameters);
        }

        return $this;
    }

    public function setParameters(array $parameters): self
    {
        $this->parameters = $parameters;

        return $this;
    }

    public function addParameters(array $parameters): self
    {
        $this->parameters = $parameters + $this->parameters;

        return $this;
    }

    public function setForm(
        FormInterface $form,
        string $parameterName = 'form'
    ): self {
        $this->parameters[$parameterName] = $form->createView();
        $this->formHasErrors = $form->getErrors(true, true)->count() > 0;

        return $this;
    }

    public function setRedirect(Response $response): self
    {
        $this->redirect = $response;

        return $this;
    }

    public function setRedirectUrl(string $url): self
    {
        $this->redirect = new RedirectResponse($url);

        return $this;
    }

    public function getRedirect(): ?Response
    {
        return $this->redirect;
    }

    public function getRedirectUrl(): ?string
    {
        if ($this->redirect instanceof RedirectResponse) {
            return $this->redirect->getTargetUrl();
        }

        return null;
    }

    public function hasAction(): bool
    {
        return (bool) ($this->view || $this->redirect);
    }

    public function render(): Response
    {
        if ($this->redirect) {
            return $this->renderRedirect($this->redirect);
        }

        if (!$this->view) {
            throw new RuntimeException('AdaptiveFormResponseService requires a view to render.');
        }

        $response = $this->adaptiveRendererService->adaptiveRender(
            $this->view,
            $this->parameters
        );
        if ($response instanceof JsonResponse && $this->formHasErrors !== null) {
            $data = json_decode((string) $response->getContent(), true) ?: [];
            $data['form_meta'] = [
                'has_errors' => $this->formHasErrors,
            ];

            return new JsonResponse(
                $data,
                $response->getStatusCode(),
                $response->headers->all()
            );
        }

        return $response;
    }

    private function renderRedirect(Response $response): Response
    {
        if (!$response instanceof RedirectResponse) {
            return $response;
        }

        if ($this->adaptiveResponseService->detectOutputType() === RenderPass::OUTPUT_TYPE_RESPONSE_JSON) {
            return new JsonResponse([
                'redirect' => [
                    'url' => $response->getTargetUrl(),
                ],
            ]);
        }

        return $response;
    }
}
