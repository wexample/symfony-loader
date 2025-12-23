<?php

namespace Wexample\SymfonyDesignSystem\Routing;

use Symfony\Component\DependencyInjection\Argument\RewindableGenerator;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Routing\Route;
use Symfony\Component\Routing\RouteCollection;
use Wexample\Helpers\Helper\ClassHelper;
use Wexample\Helpers\Helper\FileHelper;
use Wexample\SymfonyDesignSystem\Controller\AbstractController;
use Wexample\SymfonyDesignSystem\Routing\Attribute\TemplateBasedRoutes;
use Wexample\SymfonyHelpers\Helper\TemplateHelper;
use Wexample\SymfonyHelpers\Routing\AbstractRouteLoader;
use Wexample\SymfonyHelpers\Routing\Traits\RoutePathBuilderTrait;

class TemplateBasedRouteLoader extends AbstractRouteLoader
{
    use RoutePathBuilderTrait;

    public function __construct(
        protected RewindableGenerator $taggedControllers,
        protected ParameterBagInterface $parameterBag,
        ContainerInterface $container,
        string $env = null
    ) {
        parent::__construct($container, $env);
    }

    protected function loadOnce(
        $resource,
        string $type = null
    ): RouteCollection {
        $collection = new RouteCollection();

        /** @var AbstractController $controller */
        foreach ($this->taggedControllers as $controller) {

            if (ClassHelper::hasAttributes($controller::class, TemplateBasedRoutes::class)) {
                $reflectionClass = new \ReflectionClass($controller);

                $templatePath = $controller::getControllerTemplateDir();
                $templatesDir = $this->parameterBag->get('kernel.project_dir') . FileHelper::FOLDER_SEPARATOR . $templatePath;

                // Use Finder to scan template files
                $finder = new Finder();
                $finder->files()->in($templatesDir)->name('*' . TemplateHelper::TEMPLATE_FILE_EXTENSION);

                foreach ($finder as $file) {
                    // Extract template name (without extension)
                    $filename = $file->getBasename(TemplateHelper::TEMPLATE_FILE_EXTENSION);
                    $routeName = $controller::buildRouteName($filename);
                    $fullPath = $this->buildRoutePathFromController($controller, $filename);

                    if ($fullPath) {
                        // Create the route
                        $route = new Route($fullPath, [
                            '_controller' => $reflectionClass->getName() . '::resolveSimpleRoute',
                            'routeName' => $filename,
                        ]);

                        $collection->add($routeName, $route);
                    }
                }
            }
        }

        return $collection;
    }

    protected function getName(): string
    {
        return 'template_based_routes';
    }
}
